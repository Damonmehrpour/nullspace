import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useRef, type MutableRefObject } from 'react'
import { Object3D, type InstancedMesh } from 'three'
import { Concrete } from '../v2/Surface'

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
  const tmp = useRef(new Object3D())

  const place = (p: number) => {
    const m = ref.current
    if (!m) return
    const o = tmp.current
    blocks.forEach((b, i) => {
      o.position.set(...b.pos)
      o.rotation.set(0, b.rotY ?? 0, 0)
      o.scale.set(...b.size)
      animate?.(i, b, p, o)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
    })
    m.instanceMatrix.needsUpdate = true
  }

  useLayoutEffect(() => place(progress?.current ?? 1))
  useFrame(() => {
    if (animate && progress) place(progress.current)
  })

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, blocks.length]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <Concrete color={color} roughness={0.92} emissive={emissive} />
    </instancedMesh>
  )
}
