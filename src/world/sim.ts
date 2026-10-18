// Mutable per-frame simulation state, advanced only by simulate(dt). Components read it in useFrame.
// Keeping one step function makes a deterministic test clock possible (plan Task 25).
import { WORLD } from '../content/world'
import type { InputState } from '../core/input'
import { createPlayer, stepPlayer, type PlayerState } from '../core/playerMotion'
import { createWalkable } from '../core/walkable'
import { isGameplayPaused, useStore } from '../state/store'

export const walk = createWalkable(WORLD)

export type Sim = {
  player: PlayerState
  cameraYaw: number
  input: { state: InputState; clear(): void; dispose(): void } | null
  listeners: Set<(events: string[]) => void>
}

export const sim: Sim = {
  player: createPlayer(WORLD),
  cameraYaw: WORLD.spawn.facing,
  input: null,
  listeners: new Set(),
}

const NO_INPUT: InputState = { up: false, down: false, left: false, right: false, interact: false }

export function resetSim(): void {
  sim.player = createPlayer(WORLD)
  sim.cameraYaw = WORLD.spawn.facing
}

/** Advances gameplay by dt seconds: input → player (→ guide, zones, camera in later tasks). */
export function simulate(dt: number): void {
  const paused = isGameplayPaused(useStore.getState())
  if (paused) sim.input?.clear()
  const r = stepPlayer(sim.player, sim.input?.state ?? NO_INPUT, sim.cameraYaw, dt, walk, paused)
  sim.player = r.state
  if (r.events.length > 0) for (const l of sim.listeners) l(r.events)
}
