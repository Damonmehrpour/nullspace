import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type { Group, Mesh } from 'three'
import { useRenderBudget } from '../quality'
import { sim } from '../sim'
import { radialShadowTexture } from './textures'

const H = 0.7

/** The v2 player: a slender white shard with a floating halo — an abstract pilgrim, not a capsule. */
export function PlayerV2() {
  const ref = useRef<Group>(null)
  const halo = useRef<Mesh>(null)
  const shadow = useRef<Mesh>(null)
  const { playerLight } = useRenderBudget()
  const tex = useMemo(() => radialShadowTexture(), [])
  useFrame(({ clock }) => {
    const g = ref.current
    if (!g) return
    g.position.set(sim.player.pos.x, 0, sim.player.pos.z)
    g.rotation.y = -sim.player.facing
    if (halo.current) halo.current.position.y = H + 0.16 + Math.sin(clock.elapsedTime * 2) * 0.025
    if (shadow.current) shadow.current.position.set(sim.player.pos.x, 0.02, sim.player.pos.z)
  })
  return (
    <>
      <group ref={ref}>
        <mesh position={[0, H / 2, 0]}>
          <cylinderGeometry args={[0.035, 0.13, H, 6]} />
          <meshStandardMaterial color="#f6f5f1" roughness={0.45} emissive="#ffffff" emissiveIntensity={0.12} flatShading />
        </mesh>
        <mesh ref={halo} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.12, 0.009, 6, 40]} />
          <meshBasicMaterial color="#ffffff" toneMapped={false} />
        </mesh>
        {playerLight && <pointLight position={[0, 0.9, 0]} intensity={0.5} distance={3} color="#ffffff" />}
      </group>
      <mesh ref={shadow} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
        <planeGeometry args={[0.8, 0.8]} />
        <meshBasicMaterial map={tex} color="black" transparent depthWrite={false} opacity={0.55} fog={false} />
      </mesh>
    </>
  )
}
