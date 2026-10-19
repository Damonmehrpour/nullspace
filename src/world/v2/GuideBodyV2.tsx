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
import { guideCue, guideLook } from './cues'
import { NOISE_GLSL } from './glsl'
import { leafShape } from './shapes'
import { radialShadowTexture } from './textures'

const R = 0.34
const SHELLS = [
  { scale: 1.04, threshold: 0.58, tint: '#5b9532' },
  { scale: 1.08, threshold: 0.68, tint: '#73b043' },
  { scale: 1.13, threshold: 0.79, tint: '#aedb72' }, // sparse light tips (a 4th shell cost ~2.5 ms on the pixel-bound profile)
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
      // Cushion clumps: a second, coarser set of lumps, so the silhouette reads as moss pads, not a ball.
      const clump = Math.sin(x * 11 + z * 5 + 1.3) * Math.sin(y * 9 - x * 4) * Math.sin(z * 10 + y * 3)
      const k = 1 + n * 0.045 + Math.sqrt(Math.max(0, clump)) * 0.085
      pos.setXYZ(i, x * k, y * k * 0.94, z * k)
      c.copy(dark).lerp(light, Math.min(1, 0.3 + n * 0.35 + Math.sqrt(Math.max(0, clump)) * 0.6))
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
  diffuseColor.rgb *= (0.72 + mossN * 0.5) * (0.8 + mossPatch * 0.4);
  if (uThreshold == 0.0) {
    // Lichen flecks: pale yellow-green crusts between the moss, on the core only.
    float lichen = smoothstep(0.8, 0.86, nsNoise(vMoss * 24.0 + 7.3));
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.66, 0.74, 0.42), lichen * 0.4);
  }`,
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
    const a = new TorusGeometry(R * 1.045, 0.012, 6, 64)
    a.rotateX(Math.PI / 2 - 0.22)
    const b = new TorusGeometry(R * 1.045, 0.012, 6, 64)
    b.rotateX(Math.PI / 2 + 0.35)
    b.rotateY(1.25)
    return mergeGeometries([a, b])!
  }, [])
}

/** Five dangling roots: tubes that taper to fine tips, hanging from the underside. */
function useRoots() {
  return useMemo(
    () =>
      [
        [0.05, -0.03, 0.26, 0.011],
        [-0.06, 0.02, 0.2, 0.01],
        [0.01, 0.06, 0.15, 0.009],
        [-0.02, -0.06, 0.22, 0.009],
        [0.065, 0.04, 0.12, 0.008],
      ].map(([dx, dz, len, r]) => {
        const curve = new CatmullRomCurve3([new Vector3(0, 0, 0), new Vector3(dx * 0.9, -len * 0.4, dz * 0.5), new Vector3(dx * 0.4, -len * 0.75, dz * 1.4), new Vector3(-dx * 0.3, -len, dz * 0.8)])
        const segs = 16
        const geo = new TubeGeometry(curve, segs, r, 5, false)
        // Taper: pull each ring toward the curve as it nears the tip.
        const pos = geo.getAttribute('position')
        const ring = 6
        for (let i = 0; i <= segs; i++) {
          const t = i / segs
          const c = curve.getPointAt(t)
          for (let j = 0; j < ring; j++) {
            const k = i * ring + j
            const f = 1 - 0.75 * t
            pos.setXYZ(k, c.x + (pos.getX(k) - c.x) * f, c.y + (pos.getY(k) - c.y) * f, c.z + (pos.getZ(k) - c.z) * f)
          }
        }
        geo.computeVertexNormals()
        return { geo, attach: new Vector3(dx * 0.4, -R * 0.9, dz * 0.4) }
      }),
    [],
  )
}

/** A curling sprout frond on the crown, like a young fern unrolling. */
function useFrond() {
  return useMemo(() => {
    const curve = new CatmullRomCurve3([new Vector3(0, 0, 0), new Vector3(0.02, 0.08, 0.01), new Vector3(0.05, 0.15, 0), new Vector3(0.04, 0.2, -0.02), new Vector3(0.005, 0.205, -0.025), new Vector3(0.0, 0.185, -0.01)])
    // Leaf anchors along the stem, computed once (not per frame).
    const anchors = [0, 1, 2].map((i) => {
      const u = 0.3 + i * 0.22
      const tan = curve.getTangentAt(u)
      return { p: curve.getPointAt(u), yaw: Math.atan2(tan.z, tan.x) }
    })
    return { anchors, stem: new TubeGeometry(curve, 24, 0.006, 5, false) }
  }, [])
}

/**
 * The v2 kokedama: a living moss ball with a fuzzy silhouette, lumpy cushion moss and lichen, leaves and a
 * curling sprout, tiny buds, crossed twine and swinging roots. It perks up when it speaks, droops
 * while kept waiting, leans toward the player, ruffles when the player brushes past and hops when it
 * greets. Consumes only sim.guidePose and sim.player, like the original body (drop-in replacement).
 */
const LEAVES = 9
const FROND_LEAVES = 3
const BUDS = 5

export function GuideBodyV2() {
  const { detail } = useRenderBudget()
  const fullDetail = detail !== 'low' // Low drops the fuzz shells
  const showBuds = detail === 'high' // Medium and Low hide the buds
  const root = useRef<Group>(null)
  const body = useRef<Group>(null)
  const leaves = useRef<InstancedMesh>(null)
  const frondLeaves = useRef<InstancedMesh>(null)
  const frond = useRef<Group>(null)
  const buds = useRef<InstancedMesh>(null)
  const rootRefs = useRef<(Group | null)[]>([])
  const shadow = useRef<Mesh>(null)
  const coreMat = useMemo(() => mossMaterial(0, null), [])
  const shellMats = useMemo(() => SHELLS.map((s) => mossMaterial(s.threshold, s.tint)), [])
  const core = useMossCore()
  const leaf = useLeafGeometry()
  const twine = useTwine()
  const roots = useRoots()
  const sprout = useFrond()
  const budGeo = useMemo(() => new SphereGeometry(0.014, 8, 6), [])
  const shadowTex = useMemo(() => radialShadowTexture(), [])
  const leafObj = useMemo(() => new Object3D(), [])
  const motion = useRef({ last: new Vector3(), vel: new Vector3(), swing: new Vector3(), waitT: 0, ruffle: 0, hopT: 9, lastState: '', tiltX: 0, tiltZ: 0, cue: guideCue.seq, delight: 0 })

  const placeLeaves = (sway: number, lean: number, t: number) => {
    const m = leaves.current
    if (!m) return
    for (let i = 0; i < LEAVES; i++) {
      const a = (i / LEAVES) * Math.PI * 2 + 0.3
      const big = i % 3 !== 1
      const l = lean + (big ? 0 : 0.2) + Math.sin(t * 2.4 + i * 1.9) * sway
      leafObj.position.set(Math.cos(a) * (big ? 0.05 : 0.08), R * (big ? 0.9 : 0.86), Math.sin(a) * (big ? 0.05 : 0.08))
      leafObj.rotation.set(0, -a + Math.PI / 2, 0)
      leafObj.rotateX(l)
      leafObj.scale.setScalar(big ? 1.05 + (i % 2) * 0.15 : 0.62)
      leafObj.updateMatrix()
      m.setMatrixAt(i, leafObj.matrix)
    }
    m.instanceMatrix.needsUpdate = true
    const f = frondLeaves.current
    if (f) {
      for (let i = 0; i < FROND_LEAVES; i++) {
        const an = sprout.anchors[i]
        leafObj.position.copy(an.p)
        leafObj.rotation.set(0, (i % 2 ? 1 : -1) * 1.4 + an.yaw, 0)
        leafObj.rotateX(0.9 + Math.sin(t * 3 + i) * sway)
        leafObj.scale.setScalar(0.42 - i * 0.06)
        leafObj.updateMatrix()
        f.setMatrixAt(i, leafObj.matrix)
      }
      f.instanceMatrix.needsUpdate = true
    }
  }

  useLayoutEffect(() => {
    placeLeaves(0, 0.55, 0)
    const b = buds.current
    if (b) {
      const o = new Object3D()
      for (let i = 0; i < BUDS; i++) {
        const a = i * 2.2 + 0.7
        const tilt = 0.32 + (i % 2) * 0.12
        o.position.set(Math.cos(a) * Math.sin(tilt) * R * 1.02, Math.cos(tilt) * R * 1.02, Math.sin(a) * Math.sin(tilt) * R * 1.02)
        o.scale.setScalar(0.8 + (i % 3) * 0.2)
        o.updateMatrix()
        b.setMatrixAt(i, o.matrix)
      }
      b.instanceMatrix.needsUpdate = true
    }
  })

  useFrame(({ clock }, rawDt) => {
    const pose = sim.guidePose
    const r = root.current
    const b = body.current
    if (!r || !b) return
    const dt = Math.min(rawDt, 0.1)
    const t = clock.elapsedTime
    const calm = reducedMotion() ? 0.4 : 1
    const mo = motion.current

    // Greeting hop: a short arc each time it enters the greet state.
    if (pose.state === 'greet' && mo.lastState !== 'greet') mo.hopT = 0
    // A discovery in the world (e.g. the player walks through an Experience portal): hop, glow, perk up.
    if (guideCue.seq !== mo.cue) {
      mo.cue = guideCue.seq
      mo.hopT = 0
      mo.delight = 1
    }
    mo.delight = Math.max(0, mo.delight - dt * 0.7)
    mo.lastState = pose.state
    mo.hopT += dt
    const hop = mo.hopT < 0.5 ? Math.sin((mo.hopT / 0.5) * Math.PI) * 0.16 * calm : 0
    const bob = Math.sin(t * 1.6) * GUIDE.bobAmp * calm
    r.position.set(pose.position.x, pose.height + bob + hop, pose.position.z)

    // Velocity drives lean and root swing.
    if (dt > 0) mo.vel.set((r.position.x - mo.last.x) / dt, 0, (r.position.z - mo.last.z) / dt)
    mo.last.copy(r.position)
    const speed = Math.min(mo.vel.length(), 5)
    mo.swing.lerp(mo.vel.clone().multiplyScalar(-0.09 * calm), 1 - Math.exp(-dt * 4))

    // While telling a story the kokedama turns toward what it is talking about.
    const looking = performance.now() < guideLook.untilMs
    const targetYaw = looking ? -Math.atan2(guideLook.z - pose.position.z, guideLook.x - pose.position.x) : -pose.facing
    r.rotation.y += Math.atan2(Math.sin(targetYaw - r.rotation.y), Math.cos(targetYaw - r.rotation.y)) * 0.12

    // The player: lean toward them while waiting; ruffle when they brush past.
    const px = sim.player.pos.x - pose.position.x
    const pz = sim.player.pos.z - pose.position.z
    const pd = Math.hypot(px, pz)
    const playerSpeed = Math.hypot(sim.player.vel.x, sim.player.vel.z)
    if (pd < 1.4 && playerSpeed > 1) mo.ruffle = 1
    mo.ruffle = Math.max(0, mo.ruffle - dt * 0.9)
    const attentive = pose.state === 'wait' || pose.state === 'idle' || pose.state === 'present'
    const la = Math.atan2(pz, px) + r.rotation.y
    const lean = attentive && pd < 6 ? 0.13 * calm : 0
    mo.tiltX += (Math.sin(la) * lean - mo.tiltX) * (1 - Math.exp(-dt * 3))
    mo.tiltZ += (-Math.cos(la) * lean - mo.tiltZ) * (1 - Math.exp(-dt * 3))
    mo.waitT = pose.state === 'wait' ? mo.waitT + dt : 0

    const squash = pose.squash * calm
    const speak = pose.speakPulse * calm
    b.scale.set(1 + 0.1 * squash + 0.05 * speak, 1 - 0.18 * squash + 0.07 * speak, 1 + 0.1 * squash + 0.05 * speak)
    // Lean into travel; a slow curious tilt while waiting; a quick wiggle when speaking.
    b.rotation.x = speed * 0.05 * calm + mo.tiltX
    b.rotation.z = pose.beckon * Math.sin(t * 1.3) * 0.22 * calm + Math.sin(t * 18) * speak * 0.06 + mo.tiltZ
    coreMat.emissiveIntensity = 0.3 + pose.glow * 0.5 + mo.delight * 0.35

    // Leaves perk up when it speaks or greets and droop slowly the longer it's kept waiting.
    const droop = Math.min(mo.waitT / 8, 1) * 0.5
    const perk = speak * 0.3 + (pose.state === 'greet' ? 0.25 : 0) + mo.delight * 0.3
    const sway = (0.06 + 0.1 * Math.min(speed, 1) + 0.25 * speak + 0.3 * mo.ruffle) * calm
    placeLeaves(sway, 0.55 + droop - perk, t)
    if (frond.current) frond.current.rotation.z = Math.sin(t * 1.1) * 0.08 * calm - perk * 0.3 + droop * 0.4

    rootRefs.current.forEach((g, i) => {
      if (!g) return
      // Swing with motion; a slow curl at rest.
      g.rotation.x = mo.swing.z + Math.sin(t * 1.9 + i) * 0.06 * calm
      g.rotation.z = -mo.swing.x + Math.cos(t * 1.7 + i * 2) * 0.06 * calm + Math.sin(t * 0.6 + i) * 0.05 * calm
    })

    const s = shadow.current
    if (s) {
      s.position.set(pose.position.x, 0.02, pose.position.z)
      const h = pose.height + bob + hop
      ;(s.material as MeshBasicMaterial).opacity = 0.55 / (1 + h * 0.6)
      s.scale.setScalar(0.7 + h * 0.18)
    }
  })

  return (
    <>
      <group ref={root} name="v2-kokedama">
        <group ref={body}>
          <mesh geometry={core} material={coreMat} />
          {fullDetail && shellMats.map((m, i) => <mesh name="v2-shell" key={i} geometry={core} material={m} scale={SHELLS[i].scale} />)}
          <mesh geometry={twine}>
            <meshLambertMaterial color="#a8854e" />
          </mesh>
          <instancedMesh ref={leaves} args={[leaf, undefined, LEAVES]}>
            <meshStandardMaterial color="#8fd14f" side={DoubleSide} roughness={0.7} emissive="#2b5a12" emissiveIntensity={0.45} />
          </instancedMesh>
          <group ref={frond} position={[0.02, R * 0.92, -0.03]}>
            <mesh geometry={sprout.stem}>
              <meshLambertMaterial color="#7fae45" emissive="#244a10" emissiveIntensity={0.4} />
            </mesh>
            <instancedMesh ref={frondLeaves} args={[leaf, undefined, FROND_LEAVES]}>
              <meshStandardMaterial color="#a6dc63" side={DoubleSide} roughness={0.7} emissive="#2b5a12" emissiveIntensity={0.5} />
            </instancedMesh>
          </group>
          {/* Hidden (not unmounted) on Low: unmounting disposes its material and returning to High would recompile. */}
          <instancedMesh name="v2-buds" ref={buds} args={[budGeo, undefined, BUDS]} visible={showBuds}>
            <meshLambertMaterial color="#f3ecd6" emissive="#3a3526" emissiveIntensity={0.6} />
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
