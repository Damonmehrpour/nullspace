import { useMemo } from 'react'
import type { IslandDef } from '../../content/world'
import { Artifacts } from '../artifacts/Artifacts'
import { easeOutCubic, useReveal } from '../reveals/useReveal'
import { Blocks, type Block } from './Blocks'
import { IslandBase } from './IslandBase'

/** Projects: a broken courtyard of low walls around the three artifacts. Reveal: walls rise. */
export function Projects({ island }: { island: IslandDef }) {
  const progress = useReveal(island.id)
  const walls = useMemo<Block[]>(() => {
    const r = island.radius - 0.35
    const out: Block[] = []
    const segments = [-70, -35, 0, 35, 70, 100, -100] // walkways join at ±126°; keep clear
    segments.forEach((deg, i) => {
      const a = (deg * Math.PI) / 180
      const h = 0.6 + ((i * 37) % 5) * 0.25
      out.push({ pos: [Math.cos(a) * r, h / 2, Math.sin(a) * r], size: [0.35, h, 1.6 - (i % 3) * 0.3], rotY: -a })
    })
    return out
  }, [island.radius])

  return (
    <IslandBase island={island}>
      <Blocks
        blocks={walls}
        progress={progress}
        animate={(i, b, p, o) => {
          const t = easeOutCubic(p * 1.5 - i * 0.07)
          o.position.y = b.pos[1] - b.size[1] * (1 - t)
        }}
      />
    </IslandBase>
  )
}

/** Artifacts live in world space at the layout's slots, so they are mounted beside the island group. */
export function ProjectsIsland({ island }: { island: IslandDef }) {
  return (
    <>
      <Projects island={island} />
      <Artifacts island={island} />
    </>
  )
}
