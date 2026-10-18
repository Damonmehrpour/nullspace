import { useMemo } from 'react'
import { cv } from '../content/cv'
import type { Project } from '../content/schema'
import { capabilities } from '../core/capabilities'
import { useStore } from '../state/store'

const FALLBACK = { featured: 'the featured project', technical: 'the technical project', experimental: 'the experimental project' } as const

function projectLabel(p: Project): string {
  if (p.status === 'placeholder') return `${FALLBACK[p.appearance]} (placeholder)`
  return p.name.state === 'confirmed' ? p.name.value : FALLBACK[p.appearance]
}

/** Small contextual hint when the player stands next to a project artifact. */
export function ArtifactPrompt() {
  const near = useStore((s) => s.nearArtifact)
  const panelOpen = useStore((s) => s.panel !== null)
  const touch = useMemo(() => capabilities.isTouchFirst(), [])
  if (near === null || panelOpen) return null
  const project = cv.projects.projects[near]
  return (
    <p data-testid="artifact-prompt" className="pointer-events-none fixed bottom-24 left-1/2 z-10 m-0 -translate-x-1/2 border-2 border-moss bg-void/85 px-3 py-1 text-sm text-concrete">
      {touch ? 'Tap it' : 'E or Enter'} · open {projectLabel(project)}
    </p>
  )
}
