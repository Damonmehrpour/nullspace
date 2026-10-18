import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import {
  BufferAttribute,
  CatmullRomCurve3,
  Color,
  DoubleSide,
  MeshLambertMaterial,
  Object3D,
  PlaneGeometry,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
  type Group,
  type InstancedMesh,
  type Mesh,
  type MeshBasicMaterial,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { GUIDE } from '../../core/config'
import { useRenderBudget } from '../quality'
import { reducedMotion, sim } from '../sim'
import { NOISE_GLSL } from './glsl'
import { leafShape } from './shapes'
import { radialShadowTexture } from './textures'

const R = 0.34
const SHELLS = [
  { scale: 1.04, threshold: 0.58, tint: '#5b9532' },
  { scale: 1.08, threshold: 0.68, tint: '#73b043' },
  { scale: 1.12, threshold: 0.77, tint: '#9ad064' },
]

/** Smooth, lumpy moss core with vertex-colour variation (dark crevices, lighter bumps). */
function useMossCore() {
  return useMemo(() => {
    const g = new SphereGeometry(R, 48, 32)
    const pos = g.getAttribute('position')
    const col = new Float32Array(pos.count * 3)
    const dark = new Color('#3d6e22')
    const light = new Color('#8cc556')
    const c = new Color()
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      const z = pos.getZ(i)
      const n = Math.sin(x * 19 + y * 7) * 0.5 + Math.sin(y * 23 + z * 11) * 0.3 + Math.sin(z * 29 + x * 13) * 0.2
      const k = 1 + n * 0.05
      pos.setXYZ(i, x * k, y * k * 0.94, z * k)
      c.copy(dark).lerp(light, 0.5 + n * 0.5)
      col.set([c.r, c.g, c.b], i * 3)
    }
    g.setAttribute('color', new BufferAttribute(col, 3))
    g.computeVertexNormals()
    return g
  }, [])
}

/** Moss material: fine speckle in the shader; shells discard by noise so the silhouette turns fuzzy. */
/** Lambert: fully rough, so PBR specular added nothing but cost (three shells overdraw the core). */
function mossMaterial(threshold: number, tint: string | null): MeshLambertMaterial {
  const m = new MeshLambertMaterial({ vertexColors: tint === null, color: tint ?? '#ffffff', emissive: new Color('#2a5214'), emissiveIntensity: 0.45 })
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uThreshold = { value: threshold }
    shader.vertexShader = 'varying vec3 vMoss;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvMoss = position;')
    shader.fragmentShader =
      'varying vec3 vMoss;\nuniform float uThreshold;\n' +
      NOISE_GLSL +
      shader.fragmentShader.replace(
        '#include <color_fragment>',
        /* glsl */ `#include <color_fragment>
  float mossN = nsNoise(vMoss * 70.0) * 0.65 + nsNoise(vMoss * 160.0) * 0.35;
  float mossPatch = nsNoise(vMoss * 7.0);
  if (uThreshold > 0.0 && mossN < uThreshold) discard;
  diffuseColor.rgb *= (0.72 + mossN * 0.5) * (0.8 + mossPatch * 0.4);`,
      )
  }
  m.customProgramCacheKey = () => 'nullspace-moss-v2'
  return m
}

/** A curved, pointed leaf (pivot at its base), shaped by leafShape(). */
function useLeafGeometry() {
  return useMemo(() => {
    const g = new PlaneGeometry(0.1, 0.26, 2, 8)
    g.translate(0, 0.13, 0)
    const pos = g.getAttribute('position')
    for (let i = 0; i < pos.count; i++) {
      const t = pos.getY(i) / 0.26
      const { width, curl } = leafShape(t)
      pos.setX(i, pos.getX(i) * width)
      pos.setZ(i, curl * 0.09 + Math.abs(pos.getX(i)) * 0.25)
    }
    g.computeVertexNormals()
    return g
  }, [])
}

/** Two twine bands crossing over the ball, merged into one draw call. */
function useTwine() {
  return useMemo(() => {
    const a = new TorusGeometry(R * 1.015, 0.012, 6, 64)
    a.rotateX(Math.PI / 2 - 0.22)
    const b = new TorusGeometry(R * 1.015, 0.012, 6, 64)
    b.rotateX(Math.PI / 2 + 0.35)
    b.rotateY(1.25)
    return mergeGeometries([a, b])!
  }, [])
}

/** Three dangling roots: thin tubes hanging from the underside. */
function useRoots() {
  return useMemo(
    () =>
      [
        [0.05, -0.03, 0.22, 0.009],
        [-0.06, 0.02, 0.17, 0.008],
        [0.01, 0.06, 0.13, 0.007],
      ].map(([dx, dz, len, r]) => {
        const curve = new CatmullRomCurve3([new Vector3(0, 0, 0), new Vector3(dx * 0.9, -len * 0.4, dz * 0.5), new Vector3(dx * 0.4, -len * 0.75, dz * 1.4), new Vector3(-dx * 0.3, -len, dz * 0.8)])
        return { geo: new TubeGeometry(curve, 14, r, 5, false), attach: new Vector3(dx * 0.4, -R * 0.9, dz * 0.4) }
      }),
    [],
  )
}

/**
 * The v2 kokedama: a living moss ball with a fuzzy silhouette, leaves, crossed twine and swinging
 * roots. Consumes only sim.guidePose, exactly like the original body (drop-in replacement).
 */
export function GuideBodyV2() {
  const { playerLight } = useRenderBudget()
  const fullDetail = playerLight // Low quality drops the fuzz shells
  const root = useRef<Group>(null)
  const body = useRef<Group>(null)
  const leaves = useRef<InstancedMesh>(null)
  const rootRefs = useRef<(Group | null)[]>([])
  const shadow = useRef<Mesh>(null)
  const coreMat = useMemo(() => mossMaterial(0, null), [])
  const shellMats = useMemo(() => SHELLS.map((s) => mossMaterial(s.threshold, s.tint)), [])
  const core = useMossCore()
  const leaf = useLeafGeometry()
  const twine = useTwine()
  const roots = useRoots()
  const shadowTex = useMemo(() => radialShadowTexture(), [])
  const leafObj = useMemo(() => new Object3D(), [])
  const motion = useRef({ last: new Vector3(), vel: new Vector3(), swing: new Vector3() })

  const LEAVES = 6
  const placeLeaves = (sway: number, t: number) => {
    const m = leaves.current
    if (!m) return
    for (let i = 0; i < LEAVES; i++) {
      const a = (i / LEAVES) * Math.PI * 2 + 0.3
      const lean = 0.55 + (i % 2) * 0.25 + Math.sin(t * 2.4 + i * 1.9) * sway
      leafObj.position.set(Math.cos(a) * 0.05, R * 0.9, Math.sin(a) * 0.05)
      leafObj.rotation.set(0, -a + Math.PI / 2, 0)
      leafObj.rotateX(lean)
      leafObj.scale.setScalar(i % 3 === 0 ? 1.15 : 0.85)
      leafObj.updateMatrix()
      m.setMatrixAt(i, leafObj.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  }
  useLayoutEffect(() => placeLeaves(0, 0))

  useFrame(({ clock }, rawDt) => {
    const pose = sim.guidePose
    const r = root.current
    const b = body.current
    if (!r || !b) return
    const dt = Math.min(rawDt, 0.1)
    const t = clock.elapsedTime
    const calm = reducedMotion() ? 0.4 : 1
    const bob = Math.sin(t * 1.6) * GUIDE.bobAmp * calm
    r.position.set(pose.position.x, pose.height + bob, pose.position.z)

    // Velocity drives lean and root swing.
    const mo = motion.current
    if (dt > 0) mo.vel.set((r.position.x - mo.last.x) / dt, 0, (r.position.z - mo.last.z) / dt)
    mo.last.copy(r.position)
    const speed = Math.min(mo.vel.length(), 5)
    mo.swing.lerp(mo.vel.clone().multiplyScalar(-0.09 * calm), 1 - Math.exp(-dt * 4))

    const targetYaw = -pose.facing
    r.rotation.y += Math.atan2(Math.sin(targetYaw - r.rotation.y), Math.cos(targetYaw - r.rotation.y)) * 0.12
    const squash = pose.squash * calm
    const speak = pose.speakPulse * calm
    b.scale.set(1 + 0.1 * squash + 0.05 * speak, 1 - 0.18 * squash + 0.07 * speak, 1 + 0.1 * squash + 0.05 * speak)
    // Lean into travel; a slow curious tilt while waiting; a quick wiggle when speaking.
    b.rotation.x = speed * 0.05 * calm
    b.rotation.z = pose.beckon * Math.sin(t * 1.3) * 0.22 * calm + Math.sin(t * 18) * speak * 0.06
    coreMat.emissiveIntensity = 0.3 + pose.glow * 0.5
    placeLeaves((0.06 + 0.1 * Math.min(speed, 1) + 0.25 * speak) * calm, t)

    rootRefs.current.forEach((g, i) => {
      if (!g) return
      g.rotation.x = mo.swing.z + Math.sin(t * 1.9 + i) * 0.06 * calm
      g.rotation.z = -mo.swing.x + Math.cos(t * 1.7 + i * 2) * 0.06 * calm
    })

    const s = shadow.current
    if (s) {
      s.position.set(pose.position.x, 0.02, pose.position.z)
      const h = pose.height + bob
      ;(s.material as MeshBasicMaterial).opacity = 0.55 / (1 + h * 0.6)
      s.scale.setScalar(0.7 + h * 0.18)
    }
  })

  return (
    <>
      <group ref={root}>
        <group ref={body}>
          <mesh geometry={core} material={coreMat} />
          {fullDetail && shellMats.map((m, i) => <mesh name="v2-shell" key={i} geometry={core} material={m} scale={SHELLS[i].scale} />)}
          <mesh geometry={twine}>
            <meshLambertMaterial color="#a8854e" />
          </mesh>
          <instancedMesh ref={leaves} args={[leaf, undefined, LEAVES]}>
            <meshStandardMaterial color="#8fd14f" side={DoubleSide} roughness={0.7} emissive="#2b5a12" emissiveIntensity={0.45} />
          </instancedMesh>
          {roots.map((rt, i) => (
            <group key={i} ref={(g) => void (rootRefs.current[i] = g)} position={rt.attach}>
              <mesh geometry={rt.geo}>
                <meshLambertMaterial color="#8a6a3e" />
              </mesh>
            </group>
          ))}
        </group>
      </group>
      <mesh ref={shadow} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={shadowTex} color="black" transparent depthWrite={false} opacity={0.4} fog={false} />
      </mesh>
    </>
  )
}
