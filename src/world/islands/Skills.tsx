import { useMemo } from 'react'
import type { IslandDef } from '../../content/world'
import { easeOutCubic, useReveal } from '../reveals/useReveal'
import { Blocks, type Block } from './Blocks'
import { IslandBase } from './IslandBase'
import { V2 } from '../visual'

// JS `%` keeps the sign, so three grid cells got negative heights and never rendered. Fixed under v2 only,
// so the default look stays byte-identical for comparison.
const mod9 = (n: number) => (V2 ? ((n % 9) + 9) % 9 : n % 9)

/** Skills: a field of cubes at varied heights on the outer half. Reveal: cubes rise in a wave. */
export function Skills({ island }: { island: IslandDef }) {
  const progress = useReveal(island.id)
  const cubes = useMemo<Block[]>(() => {
    const out: Block[] = []
    for (let gx = 0; gx < 4; gx++) {
      for (let gz = -3; gz <= 3; gz++) {
        const x = 0.8 + gx * 1.15
        const z = gz * 1.15
        if (Math.hypot(x, z) > island.radius - 0.6) continue
        const h = 0.3 + (mod9(gx * 7 + gz * 13 + 21) / 9) * 1.8
        out.push({ pos: [x, h / 2, z], size: [0.8, h, 0.8] })
      }
    }
    return out
  }, [island.radius])

  return (
    <IslandBase island={island}>
      <Blocks
        blocks={cubes}
        progress={progress}
        animate={(_i, b, p, o) => {
          const wave = easeOutCubic(p * 1.8 - (b.pos[0] + b.pos[2] + 4) / 14)
          o.scale.y = Math.max(0.0001, b.size[1] * wave)
          o.position.y = (b.size[1] * wave) / 2
        }}
      />
    </IslandBase>
  )
}
