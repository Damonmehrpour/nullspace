import { useMemo } from 'react'
import type { IslandDef } from '../../content/world'
import { useReveal } from '../reveals/useReveal'
import { Blocks, type Block } from './Blocks'
import { IslandBase } from './IslandBase'

const FRAMES = 5
const SPACING = 1.5
const H = 3.2
const W = 2.4

/** Experience: a corridor of repeating portal frames, a physical timeline. Reveal: frames light in sequence. */
export function Experience({ island }: { island: IslandDef }) {
  const progress = useReveal(island.id)
  const { frames, lights } = useMemo(() => {
    const frames: Block[] = []
    const lights: Block[] = []
    for (let i = 0; i < FRAMES; i++) {
      const x = -1 + i * SPACING
      frames.push({ pos: [x, H / 2, -W / 2], size: [0.3, H, 0.3] }, { pos: [x, H / 2, W / 2], size: [0.3, H, 0.3] }, { pos: [x, H + 0.15, 0], size: [0.3, 0.3, W + 0.3] })
      lights.push({ pos: [x, H - 0.02, 0], size: [0.32, 0.06, W - 0.1] })
    }
    return { frames, lights }
  }, [])

  return (
    <IslandBase island={island}>
      <Blocks blocks={frames} />
      <Blocks
        blocks={lights}
        color="#ffffff"
        emissive="#ffffff"
        progress={progress}
        animate={(i, _b, p, o) => {
          const on = p * FRAMES * 1.1 > i + 0.5
          o.scale.set(on ? 0.32 : 0.0001, 0.06, 2.3)
        }}
      />
    </IslandBase>
  )
}
