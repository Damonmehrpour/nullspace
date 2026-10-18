import { useMemo } from 'react'
import type { IslandDef } from '../../content/world'
import { easeOutCubic, useReveal } from '../reveals/useReveal'
import { Blocks, type Block } from './Blocks'
import { IslandBase } from './IslandBase'

/** Education: a stepped ziggurat of stacked slabs at the rim. Reveal: slabs slide out like drawers. */
export function Education({ island }: { island: IslandDef }) {
  const progress = useReveal(island.id)
  const blocks = useMemo<Block[]>(() => {
    const out: Block[] = []
    for (let level = 0; level < 5; level++) {
      const w = 5.2 - level * 0.9
      out.push({ pos: [island.radius - 0.4 + level * 0.25, 0.35 + level * 0.7, 0], size: [1.6 - level * 0.15, 0.6, w] })
    }
    out.push({ pos: [island.radius - 2.2, 0.2, -2.6], size: [1.2, 0.4, 0.8] }, { pos: [island.radius - 2.6, 0.15, 2.4], size: [0.9, 0.3, 1.1] })
    return out
  }, [island.radius])

  return (
    <IslandBase island={island}>
      <Blocks
        blocks={blocks}
        progress={progress}
        animate={(i, b, p, o) => {
          const t = easeOutCubic(p * 1.6 - i * 0.12)
          o.position.x = b.pos[0] + 1.2 * (1 - t)
          o.position.y = b.pos[1] - 1.4 * (1 - t)
        }}
      />
    </IslandBase>
  )
}
