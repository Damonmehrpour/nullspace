import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import { readJSON, removeKey } from '../core/safeStorage'

export type WorldProps = { onFailure: (reason: 'crash' | 'context') => void }
export type WorldModule = { default: ComponentType<WorldProps> }
export type WorldLoader = { Component: LazyExoticComponent<ComponentType<WorldProps>>; attempt: number }

/** Session flag written by "Reload and retry" so the reloaded page goes straight back to loading 3D. */
export const ENTER3D_FLAG = 'nullspace.enter3d'

/** Marks errors that came from fetching the chunk, as opposed to crashes inside the world. */
export class ChunkLoadError extends Error {
  constructor(cause: unknown) {
    super(cause instanceof Error ? cause.message : String(cause))
    this.name = 'ChunkLoadError'
  }
}

const defaultImporter = () => import('../world/WorldRoot') as Promise<WorldModule>

/**
 * Each call builds a NEW React.lazy around a NEW import() call. A lazy component that has rejected
 * is never rendered again, so Retry genuinely refetches.
 */
export function createWorldLoader(importer: () => Promise<WorldModule> = defaultImporter, attempt = 0): WorldLoader {
  return {
    Component: lazy(() =>
      importer().catch((e: unknown) => {
        throw new ChunkLoadError(e)
      }),
    ),
    attempt,
  }
}

/** True once if the previous page asked to re-enter 3D; clears the flag. */
export function consumeEnter3dFlag(): boolean {
  const set = readJSON<boolean>(ENTER3D_FLAG, false, 'session') === true
  if (set) removeKey(ENTER3D_FLAG, 'session')
  return set
}

/** How long after a WebGL context loss a world failure is attributed to that loss. */
const CONTEXT_LOSS_WINDOW_MS = 5000
let contextLostAt: number | null = null
let worldContext: { isContextLost(): boolean } | null = null

/** The world registers its WebGL context so failures can be checked against it synchronously. */
export function registerWorldContext(ctx: { isContextLost(): boolean } | null): void {
  worldContext = ctx
}

/** Called by the world when its WebGL context is lost. */
export function markContextLost(): void {
  contextLostAt = performance.now()
}

export function resetContextLoss(): void {
  contextLostAt = null
  worldContext = null
}

/** True when a failure happens shortly after a context loss (R3F rebuilds its root on the dead context and throws). */
export function failureFollowsContextLoss(): boolean {
  // isContextLost() flips synchronously; the context-lost event can arrive after the crash it causes.
  if (worldContext?.isContextLost()) return true
  return contextLostAt !== null && performance.now() - contextLostAt < CONTEXT_LOSS_WINDOW_MS
}
