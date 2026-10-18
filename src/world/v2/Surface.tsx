import type { Side } from 'three'
import { V2 } from '../visual'
import { concreteMaterial } from './concrete'

/**
 * Material switch shared by world components: the original flat material by default, the v2 concrete
 * under `?visual=v2`. The v1 branch renders exactly what the components rendered before.
 */
export function Concrete({ color, roughness = 0.95, emissive, side }: { color: string; roughness?: number; emissive?: string; side?: Side }) {
  if (V2) return <primitive object={concreteMaterial(color, { emissive, side })} attach="material" />
  return <meshStandardMaterial color={color} roughness={roughness} emissive={emissive ?? '#000000'} emissiveIntensity={emissive ? 1 : 0} {...(side === undefined ? {} : { side })} />
}
