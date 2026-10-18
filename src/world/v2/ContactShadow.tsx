import { useMemo } from 'react'
import { radialShadowTexture, rectShadowTexture } from './textures'

/**
 * A soft dark decal on the ground under a static object: the "contact shadow" that grounds it,
 * without any shadow map. Rendered after opaque geometry, never writes depth.
 */
export function ContactShadow({
  position,
  size,
  rotationY = 0,
  opacity = 0.55,
  shape = 'rect',
}: {
  position: [number, number, number]
  size: [number, number]
  rotationY?: number
  opacity?: number
  shape?: 'rect' | 'round'
}) {
  const map = useMemo(() => (shape === 'rect' ? rectShadowTexture() : radialShadowTexture()), [shape])
  return (
    <mesh position={[position[0], position[1] + 0.015, position[2]]} rotation={[-Math.PI / 2, 0, rotationY]} renderOrder={1}>
      <planeGeometry args={size} />
      <meshBasicMaterial map={map} transparent opacity={opacity} depthWrite={false} color="black" fog={false} polygonOffset polygonOffsetFactor={-2} />
    </mesh>
  )
}
