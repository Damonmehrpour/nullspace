import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type { BufferGeometry, Group } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { IslandDef } from '../../content/world'
import { IslandBase } from '../islands/IslandBase'
import { easeOutCubic, useReveal } from '../reveals/useReveal'
import { concreteMaterial } from './concrete'
import { ContactShadow } from './ContactShadow'

/** Bevelled box spanning [x0,x1] × [0,h] × [z0,z1] in island-local space (+x points outward). */
function block(x0: number, x1: number, h: number, z0: number, z1: number, y0 = 0, r = 0.05): BufferGeometry {
  const g = new RoundedBoxGeometry(x1 - x0, h, z1 - z0, 2, r)
  g.translate((x0 + x1) / 2, y0 + h / 2, (z0 + z1) / 2)
  return g
}

const STEPS = 7
const STAIR_W = 1.6 // half-width of the carved stair
const MASS_TOP = 3.4

/** The static mass: a stair carved into a monolith, flanking cheeks, back wall and a cantilevered lintel. */
function useArchiveMass(): BufferGeometry {
  return useMemo(() => {
    const parts: BufferGeometry[] = []
    for (let i = 0; i < STEPS; i++) parts.push(block(0.6 + i * 0.5, 5.9, (i + 1) * 0.42, -STAIR_W, STAIR_W, 0, 0.03))
    parts.push(block(0.4, 6.1, MASS_TOP, -2.45, -STAIR_W, 0, 0.08)) // left cheek
    parts.push(block(0.4, 6.1, MASS_TOP, STAIR_W, 2.45, 0, 0.08)) // right cheek
    parts.push(block(5.5, 6.3, MASS_TOP, -2.45, 2.45, 0, 0.08)) // back wall
    parts.push(block(2.5, 6.7, 0.38, -3.0, 3.0, MASS_TOP, 0.06)) // cantilevered lintel
    parts.push(block(5.9, 6.7, 1.2, -1.1, 1.1, MASS_TOP + 0.38, 0.06)) // lintel crown
    return mergeGeometries(parts, false)!
  }, [])
}

type Spine = { x: number; side: 1 | -1; h: number; tilt: number; i: number }

/** Archive slabs leaning on the cheeks like giant book spines, five per side. */
function useSpines(): Spine[] {
  return useMemo(() => {
    const out: Spine[] = []
    const heights = [2.3, 3.0, 2.6, 3.3, 2.1]
    for (const side of [-1, 1] as const) {
      heights.forEach((h, k) => out.push({ x: 1.05 + k * 1.0, side, h: side === 1 ? h : heights[4 - k], tilt: side * (0.05 + (k % 2) * 0.04), i: out.length }))
    }
    return out
  }, [])
}

/** Education & Research: the archive ziggurat. Reveal: the archive slabs slide out like drawers. */
export function EducationV2({ island }: { island: IslandDef }) {
  const progress = useReveal(island.id)
  const mass = useArchiveMass()
  const spines = useSpines()
  const spineGeo = useMemo(() => new RoundedBoxGeometry(0.8, 1, 0.3, 2, 0.05), [])
  const refs = useRef<(Group | null)[]>([])

  useFrame(() => {
    const p = progress.current
    for (const s of spines) {
      const g = refs.current[s.i]
      if (!g) continue
      const order = s.side === 1 ? s.i - 5 : s.i
      const t = easeOutCubic(p * 1.7 - order * 0.12)
      g.position.z = s.side * (2.62 - (1 - t) * 0.95)
      g.position.y = -(1 - t) * 0.6
    }
  })

  return (
    <IslandBase island={island}>
      <ContactShadow position={[3.3, 0, 0]} size={[7.6, 8.4]} opacity={0.62} />
      <mesh geometry={mass} material={concreteMaterial('#ebe7df')} />
      {/* Light slot under the lintel's front edge: knowledge as a line of light. */}
      <mesh position={[2.62, MASS_TOP - 0.03, 0]}>
        <boxGeometry args={[0.08, 0.05, 5.6]} />
        <meshBasicMaterial color="#fff2d8" toneMapped={false} />
      </mesh>
      {spines.map((s) => (
        <group key={s.i} ref={(r) => void (refs.current[s.i] = r)} position={[s.x, 0, s.side * 2.62]}>
          <mesh geometry={spineGeo} material={concreteMaterial(s.i % 3 === 0 ? '#d9d5cc' : '#e4e0d7')} position={[0, s.h / 2, 0]} scale={[1, s.h, 1]} rotation={[s.tilt, 0, 0]} />
        </group>
      ))}
    </IslandBase>
  )
}
