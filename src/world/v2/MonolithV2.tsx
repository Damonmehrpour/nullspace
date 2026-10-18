import { useFrame } from '@react-three/fiber'
import { useMemo } from 'react'
import { AdditiveBlending, MeshBasicMaterial } from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { WorldLayout } from '../../content/world'
import { at } from '../space'
import { concreteMaterial } from './concrete'
import { ContactShadow } from './ContactShadow'
import { IslandSlab } from './IslandSlab'
import { radialShadowTexture } from './textures'

const H = 10
const LIFT = 0.35
const YAW = Math.PI / 5

/** Spawn: a heavy monolith hovering over a floating plinth, split by the slit the kokedama comes from. */
export function MonolithV2({ layout }: { layout: WorldLayout }) {
  const { centre, plinthRadius } = layout.monolith
  const slab = useMemo(() => new RoundedBoxGeometry(3.2, H, 1.3, 3, 0.12), [])
  const glow = useMemo(() => radialShadowTexture(), [])
  // Its own material instance, so it can fade when it blocks the camera without touching other concrete.
  const slabMat = useMemo(() => {
    const m = concreteMaterial('#ece9e2').clone()
    m.onBeforeCompile = concreteMaterial('#ece9e2').onBeforeCompile
    m.customProgramCacheKey = concreteMaterial('#ece9e2').customProgramCacheKey
    m.transparent = true
    return m
  }, [])
  const slitMat = useMemo(() => new MeshBasicMaterial({ color: '#effbe6', toneMapped: false, transparent: true }), [])
  const haloMat = useMemo(() => new MeshBasicMaterial({ map: glow, color: '#7fbf4a', transparent: true, opacity: 0.28, blending: AdditiveBlending, depthWrite: false, fog: false }), [glow])
  // The slit and its halo fade together with the slab when it blocks the camera.
  useFrame(() => {
    slitMat.opacity = slabMat.opacity
    haloMat.opacity = 0.28 * slabMat.opacity
  })
  return (
    <group position={at(centre)}>
      <IslandSlab position={[0, 0, 0]} radius={plinthRadius} depth={4.5} seed={3.3} />
      <ContactShadow position={[0, 0, 0]} size={[4.6, 2.6]} rotationY={-YAW} opacity={0.45} />
      <group rotation={[0, YAW, 0]}>
        <mesh geometry={slab} material={slabMat} position={[0, LIFT + H / 2, 0]} userData={{ blocksCamera: true, fadeOnBlock: true }} />
        {/* The birth slit: a cut of pale light through the whole slab. */}
        <mesh position={[0, LIFT + H * 0.5, 0]} material={slitMat}>
          <boxGeometry args={[0.1, H * 0.72, 1.34]} />
        </mesh>
        {/* A faint halo around the slit, faked with an additive card (no post-processing). */}
        {[-0.68, 0.68].map((z) => (
          <mesh key={z} position={[0, LIFT + H * 0.5, z]} material={haloMat}>
            <planeGeometry args={[1.6, H * 0.85]} />
          </mesh>
        ))}
      </group>
    </group>
  )
}
