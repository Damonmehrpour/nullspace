import type { WorldLayout } from '../../content/world'
import { at } from '../space'

/** Spawn plinth with the hovering slab and its slit of light (the kokedama's door). */
export function Monolith({ layout }: { layout: WorldLayout }) {
  const { centre, plinthRadius } = layout.monolith
  return (
    <group position={at(centre)}>
      <mesh position={[0, -0.75, 0]} receiveShadow>
        <cylinderGeometry args={[plinthRadius, plinthRadius * 0.92, 1.5, 48]} />
        <meshStandardMaterial color="#d9d8d2" roughness={0.95} />
      </mesh>
      <mesh position={[0, 5, 0]} rotation={[0, Math.PI / 5, 0]}>
        <boxGeometry args={[3, 9, 1]} />
        <meshStandardMaterial color="#ecebe6" roughness={0.9} />
      </mesh>
      <mesh position={[0, 5, 0]} rotation={[0, Math.PI / 5, 0]}>
        <boxGeometry args={[0.12, 7, 1.02]} />
        <meshBasicMaterial color="#f6fff0" toneMapped={false} />
      </mesh>
    </group>
  )
}
