import { useMemo } from 'react'
import type { IslandDef } from '../../content/world'
import { easeOutCubic, useReveal } from '../reveals/useReveal'
import { Blocks, type Block } from './Blocks'
import { IslandBase } from './IslandBase'

// JS `%` keeps the sign; without wrapping, three grid cells got negative heights and never rendered.
const mod9 = (n: number) => ((n % 9) + 9) % 9

/** The skills grid: cubes of varied height on the outer half of an island of this radius. */
export function skillsLayout(radius: number): Block[] {
  const out: Block[] = []
  for (let gx = 0; gx < 4; gx++) {
    for (let gz = -3; gz <= 3; gz++) {
      const x = 0.8 + gx * 1.15
      const z = gz * 1.15
      if (Math.hypot(x, z) > radius - 0.6) continue
      const h = 0.3 + (mod9(gx * 7 + gz * 13 + 21) / 9) * 1.8
      out.push({ pos: [x, h / 2, z], size: [0.8, h, 0.8] })
    }
  }
  return out
}

/** Skills: a field of cubes at varied heights on the outer half. Reveal: cubes rise in a wave. */
export function Skills({ island }: { island: IslandDef }) {
  const progress = useReveal(island.id)
  const cubes = useMemo(() => skillsLayout(island.radius), [island.radius])

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
