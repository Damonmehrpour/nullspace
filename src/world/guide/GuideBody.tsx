import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { BufferAttribute, Color, DoubleSide, IcosahedronGeometry, Object3D, type Group, type InstancedMesh, type MeshStandardMaterial } from 'three'
import { GUIDE } from '../../core/config'
import { reducedMotion, sim } from '../sim'

const RADIUS = 0.35
const MOSS_DARK = new Color('#4f8a2b')
const MOSS_LIGHT = new Color('#7fbf4a')
const LEAF_COUNT = 4

/** Cheap deterministic surface noise from layered sines (no texture, no shader). */
function bump(x: number, y: number, z: number): number {
  return Math.sin(x * 11.3 + y * 3.1) * 0.5 + Math.sin(y * 13.7 + z * 5.3) * 0.3 + Math.sin(z * 17.1 + x * 7.9) * 0.2
}

function useMossGeometry() {
  return useMemo(() => {
    const geo = new IcosahedronGeometry(RADIUS, 3)
    const pos = geo.getAttribute('position')
    const colors = new Float32Array(pos.count * 3)
    const c = new Color()
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      const z = pos.getZ(i)
      const n = bump(x, y, z)
      const s = 1 + n * 0.085
      pos.setXYZ(i, x * s, y * s, z * s)
      c.copy(MOSS_DARK).lerp(MOSS_LIGHT, 0.5 + n * 0.5)
      colors.set([c.r, c.g, c.b], i * 3)
    }
    geo.setAttribute('color', new BufferAttribute(colors, 3))
    geo.computeVertexNormals()
    return geo
  }, [])
}

/**
 * The procedural kokedama. Consumes only sim.guidePose, so an authorised model of the original
 * XR guide could replace this component without touching the guide's behaviour.
 */
export function GuideBody() {
  const root = useRef<Group>(null)
  const body = useRef<Group>(null)
  const leaves = useRef<InstancedMesh>(null)
  const mat = useRef<MeshStandardMaterial>(null)
  const geo = useMossGeometry()

  const leafObj = useMemo(() => new Object3D(), [])

  /** Places the sprouts; sway (radians) bends them gently, more when the guide moves. */
  const placeLeaves = (sway: number, t: number) => {
    const m = leaves.current
    if (!m) return
    const o = leafObj
    for (let i = 0; i < LEAF_COUNT; i++) {
      const a = (i / LEAF_COUNT) * Math.PI * 2 + 0.4
      const bend = 0.9 + Math.sin(t * 2.2 + i * 1.7) * sway
      o.position.set(Math.cos(a) * 0.06, RADIUS + 0.06, Math.sin(a) * 0.06)
      o.rotation.set(bend * Math.cos(a), a, bend * Math.sin(a))
      o.scale.setScalar(i % 2 === 0 ? 1 : 0.75)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  }

  useLayoutEffect(() => placeLeaves(0, 0))

  useFrame(({ clock }) => {
    const pose = sim.guidePose
    const r = root.current
    const b = body.current
    if (!r || !b) return
    const t = clock.elapsedTime
    const calm = reducedMotion() ? 0.5 : 1
    r.position.set(pose.position.x, pose.height + Math.sin(t * 1.6) * GUIDE.bobAmp * calm, pose.position.z)
    const targetYaw = -pose.facing
    r.rotation.y += Math.atan2(Math.sin(targetYaw - r.rotation.y), Math.cos(targetYaw - r.rotation.y)) * 0.15
    const squash = pose.squash * calm
    const speak = pose.speakPulse * calm
    b.scale.set(1 + 0.1 * squash + 0.05 * speak, 1 - 0.2 * squash + 0.08 * speak, 1 + 0.1 * squash + 0.05 * speak)
    b.rotation.z = pose.beckon * Math.sin(t * 5) * 0.21 * calm + speak * 0.15
    if (mat.current) mat.current.emissiveIntensity = pose.glow
    const moving = pose.state === 'lead' ? 1 : 0
    placeLeaves((0.12 + 0.12 * moving + 0.2 * speak) * calm, t)
  })

  return (
    <group ref={root}>
      <group ref={body}>
        <mesh geometry={geo}>
          <meshStandardMaterial ref={mat} vertexColors roughness={1} emissive="#3d7a1f" emissiveIntensity={0.3} />
        </mesh>
        {/* Twine band: the detail that makes it read as a kokedama rather than a green ball. */}
        <mesh rotation={[Math.PI / 2 - 0.18, 0, 0.1]}>
          <torusGeometry args={[RADIUS * 1.07, 0.018, 6, 40]} />
          <meshStandardMaterial color="#9a7a4f" roughness={1} />
        </mesh>
        <instancedMesh ref={leaves} args={[undefined, undefined, LEAF_COUNT]}>
          <planeGeometry args={[0.09, 0.2]} />
          <meshStandardMaterial color="#8fd14f" side={DoubleSide} emissive="#3d7a1f" emissiveIntensity={0.4} />
        </instancedMesh>
      </group>
    </group>
  )
}
