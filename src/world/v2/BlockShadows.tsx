import { forwardRef, useMemo } from 'react'
import { MeshBasicMaterial, PlaneGeometry, Sphere, Vector3, type InstancedMesh } from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { BEVEL_UNIT } from './concrete'
import { rectShadowTexture } from './textures'

let unitBox: RoundedBoxGeometry | null = null
/** Unit chamfered box (one bevel segment, 108 triangles) shared by all instanced v2 blocks; the concrete bevel shader fixes its scale. */
export function bevelUnitBox(): RoundedBoxGeometry {
  unitBox ??= new RoundedBoxGeometry(1, 1, 1, 1, BEVEL_UNIT)
  return unitBox
}

let flatPlane: PlaneGeometry | null = null
let shadowMat: MeshBasicMaterial | null = null

/** How far a contact shadow reaches past a block's footprint, in metres. */
export const SHADOW_SPREAD = 0.55

/**
 * Contact shadows for a set of instanced blocks, in one draw call: a soft dark pad under each
 * grounded block, so nothing looks pasted on. No shadow maps. Instances are placed by `Blocks`.
 */
export const BlockShadows = forwardRef<InstancedMesh, { count: number }>(function BlockShadows({ count }, ref) {
  const geo = useMemo(() => {
    flatPlane ??= new PlaneGeometry(1, 1).rotateX(-Math.PI / 2)
    return flatPlane
  }, [])
  const mat = useMemo(() => {
    shadowMat ??= new MeshBasicMaterial({ map: rectShadowTexture(), color: 'black', transparent: true, opacity: 0.5, depthWrite: false, fog: false, polygonOffset: true, polygonOffsetFactor: -2 })
    return shadowMat
  }, [])
  return <instancedMesh name="v2-blockshadow" ref={ref} args={[geo, mat, count]} renderOrder={1} />
})

/**
 * Bounds of a block set at full size (plus margin for reveal motion and shadow pads), so instanced
 * blocks on islands outside the view are culled instead of always drawn.
 */
export function blockBounds(blocks: { pos: [number, number, number]; size: [number, number, number] }[]): Sphere {
  const c = new Vector3()
  for (const b of blocks) c.add(new Vector3(...b.pos))
  c.divideScalar(Math.max(1, blocks.length))
  let r = 0
  for (const b of blocks) r = Math.max(r, c.distanceTo(new Vector3(...b.pos)) + new Vector3(...b.size).length() / 2)
  return new Sphere(c, r + SHADOW_SPREAD + 0.6)
}
