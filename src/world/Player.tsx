import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group } from 'three'
import { PLAYER } from '../core/config'
import { useRenderBudget } from './quality'
import { sim } from './sim'

/** A small abstract silhouette: a pale capsule with a soft rim glow. */
export function Player() {
  const ref = useRef<Group>(null)
  const { playerLight } = useRenderBudget()
  useFrame(() => {
    const g = ref.current
    if (!g) return
    g.position.set(sim.player.pos.x, PLAYER.height / 2, sim.player.pos.z)
    g.rotation.y = -sim.player.facing
  })
  return (
    <group ref={ref}>
      <mesh>
        <capsuleGeometry args={[0.15, PLAYER.height - 0.3, 6, 16]} />
        <meshStandardMaterial color="#f4f4f0" emissive="#ffffff" emissiveIntensity={0.25} roughness={0.6} />
      </mesh>
      {playerLight && <pointLight position={[0, 0.6, 0]} intensity={0.6} distance={3} color="#ffffff" />}
    </group>
  )
}
