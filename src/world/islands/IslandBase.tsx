import { useFrame } from '@react-three/fiber'
import { useRef, type ReactNode } from 'react'
import type { Mesh, MeshBasicMaterial } from 'three'
import type { IslandDef } from '../../content/world'
import { v } from '../../core/geometry'
import { useStore } from '../../state/store'
import { reducedMotion } from '../sim'
import { at, yawFor } from '../space'
import { IslandSlab } from '../v2/IslandSlab'
import { V2 } from '../visual'
import { IslandTitle } from './IslandTitle'

/**
 * Shared island frame: the walkable slab (top at y = 0, radius from the layout), the arrival ring
 * and the title. `children` are in local space where +x points outward, away from the monolith.
 */
export function IslandBase({ island, children }: { island: IslandDef; children?: ReactNode }) {
  const outward = v.angleOf(island.centre)
  const ring = useRef<Mesh>(null)

  // The current destination's ring breathes; the others stay quiet so the next step is obvious.
  useFrame(({ clock }) => {
    const m = ring.current
    if (!m) return
    const mat = m.material as MeshBasicMaterial
    const isTarget = useStore.getState().tourTarget === island.id
    const pulse = isTarget && !reducedMotion() ? 0.5 + 0.5 * Math.sin(clock.elapsedTime * 3) : 0
    mat.opacity = V2 ? (isTarget ? 0.35 + 0.45 * pulse : 0.12) : isTarget ? 0.55 + 0.4 * pulse : 0.25
    m.scale.setScalar(isTarget ? 1 + 0.06 * pulse : 1)
  })
  return (
    <group>
      {V2 ? (
        <IslandSlab position={at(island.centre)} radius={island.radius} seed={island.centre.x * 0.37 + island.centre.z * 0.11} />
      ) : (
        <mesh position={at(island.centre, -0.75)}>
          <cylinderGeometry args={[island.radius, island.radius * 0.85, 1.5, 48]} />
          <meshStandardMaterial color="#e2e1dc" roughness={0.95} />
        </mesh>
      )}
      {V2 && (
        // Recessed inlay groove around the arrival zone; the moss line inside it breathes.
        <mesh position={at(island.arrivalPoint, 0.006)} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[island.arrivalZoneRadius - 0.2, island.arrivalZoneRadius + 0.12, 64]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.28} depthWrite={false} />
        </mesh>
      )}
      <mesh ref={ring} position={at(island.arrivalPoint, 0.01)} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[island.arrivalZoneRadius - 0.08, island.arrivalZoneRadius, 48]} />
        <meshBasicMaterial color="#6fae3c" fog={false} transparent opacity={0.6} />
      </mesh>
      <group position={at(island.centre)} rotation={[0, yawFor(outward), 0]}>
        {children}
      </group>
      <IslandTitle island={island} />
    </group>
  )
}
