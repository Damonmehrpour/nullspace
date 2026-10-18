import type { ReactNode } from 'react'
import type { IslandDef } from '../../content/world'
import { v } from '../../core/geometry'
import { at, yawFor } from '../space'
import { IslandTitle } from './IslandTitle'

/**
 * Shared island frame: the walkable slab (top at y = 0, radius from the layout), the arrival ring
 * and the title. `children` are in local space where +x points outward, away from the monolith.
 */
export function IslandBase({ island, children }: { island: IslandDef; children?: ReactNode }) {
  const outward = v.angleOf(island.centre)
  return (
    <group>
      <mesh position={at(island.centre, -0.75)}>
        <cylinderGeometry args={[island.radius, island.radius * 0.85, 1.5, 48]} />
        <meshStandardMaterial color="#e2e1dc" roughness={0.95} />
      </mesh>
      <mesh position={at(island.arrivalPoint, 0.01)} rotation={[-Math.PI / 2, 0, 0]}>
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
