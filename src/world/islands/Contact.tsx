import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type { Mesh, MeshBasicMaterial } from 'three'
import type { IslandDef } from '../../content/world'
import { useReveal } from '../reveals/useReveal'
import { Blocks, type Block } from './Blocks'
import { IslandBase } from './IslandBase'
import { Concrete } from '../v2/Surface'

const MAST_X = 3.4
const MAST_H = 7

/** Contact: a transmission mast with a dish. Reveal: a beam of light fires upward. */
export function Contact({ island }: { island: IslandDef }) {
  const progress = useReveal(island.id)
  const beam = useRef<Mesh>(null)
  const parts = useMemo<Block[]>(
    () => [
      { pos: [MAST_X, MAST_H / 2, 0], size: [0.35, MAST_H, 0.35] },
      { pos: [MAST_X, 0.3, 0], size: [1.6, 0.6, 1.6] },
      { pos: [MAST_X, MAST_H * 0.55, 0.6], size: [0.1, 0.1, 1.2] },
      { pos: [MAST_X, MAST_H * 0.8, -0.5], size: [0.1, 0.1, 1.0] },
    ],
    [],
  )

  useFrame(() => {
    const m = beam.current
    if (!m) return
    const p = progress.current
    const live = p > 0 && p < 1
    m.visible = live
    if (live) {
      m.scale.y = 0.01 + Math.min(1, p * 2) * 40
      m.position.y = MAST_H + m.scale.y / 2
      ;(m.material as MeshBasicMaterial).opacity = 0.8 * (1 - p)
    }
  })

  return (
    <IslandBase island={island}>
      <Blocks blocks={parts} />
      <mesh position={[MAST_X - 0.6, MAST_H * 0.62, 0]} rotation={[0, 0, Math.PI / 2.6]}>
        <sphereGeometry args={[1.1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 3.2]} />
        <Concrete color="#ecebe6" roughness={0.85} side={2} />
      </mesh>
      <mesh ref={beam} position={[MAST_X, MAST_H, 0]} visible={false}>
        <cylinderGeometry args={[0.08, 0.08, 1, 12]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0} fog={false} depthWrite={false} />
      </mesh>
    </IslandBase>
  )
}
