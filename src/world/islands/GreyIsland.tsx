import type { IslandDef } from '../../content/world'
import { at } from '../space'
import { IslandTitle } from './IslandTitle'

/** Greybox island: a floating slab with its title. Replaced per island in Task 30. */
export function GreyIsland({ island }: { island: IslandDef }) {
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
      <IslandTitle island={island} />
    </group>
  )
}
