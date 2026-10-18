import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group } from 'three'
import { reducedMotion } from '../sim'

/** Featured: slow concentric rings around a soft light core. Calm, meditative. */
export function Featured() {
  const rings = useRef<Group>(null)
  useFrame((_, dt) => {
    const g = rings.current
    if (!g) return
    const k = reducedMotion() ? 0.3 : 1
    g.children.forEach((r, i) => {
      r.rotation.x += dt * 0.25 * k * (i + 1) * (i % 2 ? -1 : 1)
      r.rotation.y += dt * 0.18 * k * (i + 1)
    })
  })
  return (
    <group>
      <mesh>
        <sphereGeometry args={[0.22, 24, 16]} />
        <meshStandardMaterial color="#ffffff" emissive="#f4f8ff" emissiveIntensity={1.2} />
      </mesh>
      <group ref={rings}>
        {[0.45, 0.62, 0.8].map((r) => (
          <mesh key={r}>
            <torusGeometry args={[r, 0.02, 8, 64]} />
            <meshStandardMaterial color="#ecebe6" emissive="#ffffff" emissiveIntensity={0.25} />
          </mesh>
        ))}
      </group>
    </group>
  )
}
