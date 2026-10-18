import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group, Mesh, MeshBasicMaterial } from 'three'
import type { IslandDef } from '../../content/world'
import { v } from '../../core/geometry'
import { at } from '../space'
import { easeOutCubic, useReveal } from './useReveal'

const SLABS = 5

/**
 * The fallback reveal every island can use: a ring of slabs rises from the island's rim while a
 * light sweep expands across its surface. Also the cut-order fallback for per-island reveals.
 */
export function SharedReveal({ island }: { island: IslandDef }) {
  const progress = useReveal(island.id)
  const slabs = useRef<Group>(null)
  const sweep = useRef<Mesh>(null)

  useFrame(() => {
    const p = progress.current
    const g = slabs.current
    if (g) {
      g.children.forEach((child, i) => {
        const local = easeOutCubic(p * 1.4 - i * 0.08)
        child.position.y = -1.2 + local * 1.8
      })
    }
    const s = sweep.current
    if (s) {
      const visible = p > 0 && p < 1
      s.visible = visible
      if (visible) {
        const r = 0.2 + easeOutCubic(p) * island.radius
        s.scale.setScalar(r)
        ;(s.material as MeshBasicMaterial).opacity = 0.5 * (1 - p)
      }
    }
  })

  const outward = v.normalize(island.centre)
  return (
    <group>
      <group ref={slabs}>
        {Array.from({ length: SLABS }, (_, i) => {
          const a = v.angleOf(outward) + ((i - (SLABS - 1) / 2) * Math.PI) / 7
          const p = v.add(island.centre, v.scale(v.fromAngle(a), island.radius - 0.6))
          return (
            <mesh key={i} position={at(p, -1.2)} rotation={[0, -a, 0]}>
              <boxGeometry args={[0.5, 1.2 + (i % 2) * 0.6, 1.4]} />
              <meshStandardMaterial color="#ecebe6" roughness={0.9} />
            </mesh>
          )
        })}
      </group>
      <mesh ref={sweep} position={at(island.centre, 0.02)} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.92, 1, 64]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0} fog={false} depthWrite={false} />
      </mesh>
    </group>
  )
}
