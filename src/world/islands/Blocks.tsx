import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useRef, type MutableRefObject } from 'react'
import { Object3D, type InstancedMesh } from 'three'
import { BlockShadows, bevelUnitBox, blockBounds, SHADOW_SPREAD } from '../v2/BlockShadows'
import { concreteMaterial } from '../v2/concrete'
import { Concrete } from '../v2/Surface'
import { V2 } from '../visual'

export type Block = { pos: [number, number, number]; size: [number, number, number]; rotY?: number }

/**
 * Many concrete boxes in one draw call. `animate(i, block, progress, out)` may move each instance
 * every frame (used by reveals); without it the instances are placed once.
 */
export function Blocks({
  blocks,
  progress,
  animate,
  color = '#ecebe6',
  emissive,
}: {
  blocks: Block[]
  progress?: MutableRefObject<number>
  animate?: (i: number, b: Block, p: number, out: Object3D) => void
  color?: string
  emissive?: string
}) {
  const ref = useRef<InstancedMesh>(null)
  const shadows = useRef<InstancedMesh>(null)
  const tmp = useRef(new Object3D())
  const pad = useRef(new Object3D())
  // v2: blocks standing on the island get a contact shadow; floating parts (rods, light strips) don't.
  const grounded = V2 ? blocks.map((b) => Math.abs(b.pos[1] - b.size[1] / 2) < 0.05) : []
  const shadowCount = grounded.filter(Boolean).length

  const place = (p: number) => {
    const m = ref.current
    if (!m) return
    const o = tmp.current
    const s = shadows.current
    let k = 0
    blocks.forEach((b, i) => {
      o.position.set(...b.pos)
      o.rotation.set(0, b.rotY ?? 0, 0)
      o.scale.set(...b.size)
      animate?.(i, b, p, o)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
      if (s && grounded[i]) {
        // The pad grows with the block during reveals: full size once the block stands at full height.
        const top = b.pos[1] + b.size[1] / 2
        const f = Math.min(1, Math.max(0, (o.position.y + o.scale.y / 2) / top))
        const d = pad.current
        d.position.set(b.pos[0], 0.012, b.pos[2])
        d.rotation.set(0, b.rotY ?? 0, 0)
        d.scale.set((b.size[0] + SHADOW_SPREAD * 2) * f + 1e-4, 1, (b.size[2] + SHADOW_SPREAD * 2) * f + 1e-4)
        d.updateMatrix()
        s.setMatrixAt(k++, d.matrix)
      }
    })
    m.instanceMatrix.needsUpdate = true
    if (s) s.instanceMatrix.needsUpdate = true
  }

  useLayoutEffect(() => place(progress?.current ?? 1))
  useLayoutEffect(() => {
    if (!V2) return
    const sphere = blockBounds(blocks)
    if (ref.current) ref.current.boundingSphere = sphere
    if (shadows.current) shadows.current.boundingSphere = sphere
  }, [blocks])
  useFrame(() => {
    if (animate && progress) place(progress.current)
  })

  if (V2)
    return (
      <>
        <instancedMesh name="v2-blocks" ref={ref} args={[bevelUnitBox(), concreteMaterial(color, { emissive, bevel: true }), blocks.length]} />
        {shadowCount > 0 && <BlockShadows ref={shadows} count={shadowCount} />}
      </>
    )
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, blocks.length]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <Concrete color={color} roughness={0.92} emissive={emissive} />
    </instancedMesh>
  )
}
