import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import {
  BoxGeometry,
  BufferAttribute,
  Color,
  CylinderGeometry,
  DoubleSide,
  LatheGeometry,
  MeshBasicMaterial,
  MeshLambertMaterial,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  type BufferGeometry,
  type Group,
  type Mesh,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { useRenderBudget } from '../quality'
import { reducedMotion, sim } from '../sim'
import { radialShadowTexture } from './textures'

// The hooded wanderer: a small traveller in an impossible world. Local +x is forward (see yawFor).
// Palette: slate-indigo cloak, bone trim, near-black face, one warm ochre scarf, charcoal legs.
const CLOAK = new Color('#353b55')
const TRIM = new Color('#e4ddcc')
const FACE = new Color('#07080c')
const MANTLE = new Color('#454c69')
const HIP_Y = 0.36
const NECK_Y = 0.84
const HEM_Y = 0.32
const STRIDE = 0.62 // metres per full leg cycle
const OPEN = 0.64 // cosine of the hood opening's half-angle

function paint(g: BufferGeometry, colour: (x: number, y: number, z: number) => Color): BufferGeometry {
  const p = g.getAttribute('position')
  const col = new Float32Array(p.count * 3)
  for (let i = 0; i < p.count; i++) {
    const c = colour(p.getX(i), p.getY(i), p.getZ(i))
    col.set([c.r, c.g, c.b], i * 3)
  }
  g.setAttribute('color', new BufferAttribute(col, 3))
  return g
}

/** Short sculpted cloak: wide shoulders, a slight flare, a hem cut into points with a longer tail at the back. */
function cloakGeometry(): BufferGeometry {
  const profile = [
    [0.27, HEM_Y],
    [0.272, HEM_Y + 0.026],
    [0.268, HEM_Y + 0.03],
    [0.25, 0.48],
    [0.225, 0.62],
    [0.2, 0.73],
    [0.15, 0.79],
    [0.08, NECK_Y],
  ].map(([r, y]) => new Vector2(r, y))
  // Paint by the original rows first, so the bone trim follows the hem once it's cut into points.
  const g = paint(new LatheGeometry(profile, 40), (_x, y) => (y < HEM_Y + 0.028 ? TRIM : CLOAK))
  const p = g.getAttribute('position')
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i)
    const y = p.getY(i)
    const z = p.getZ(i)
    const a = Math.atan2(z, x) // 0 = forward
    // Hem: five soft points, the back one longest; fades out above the hem rows.
    const w = Math.max(0, 1 - (y - HEM_Y) / 0.05)
    const points = Math.pow(Math.abs(Math.cos(a * 2.5)), 6) * 0.07
    const tail = Math.max(0, -Math.cos(a)) * 0.07
    // Slightly deeper than wide front-to-back reads as shoulders, not a bell.
    p.setXYZ(i, x * 0.82, y - (points + tail) * w, z)
  }
  g.computeVertexNormals()
  return g
}

/** Shoulder mantle: a shorter, lighter layer over the cloak, cut into three points (front and sides). */
function mantleGeometry(): BufferGeometry {
  const top = 0.585
  const profile = [
    [0.255, top],
    [0.258, top + 0.022],
    [0.252, top + 0.025],
    [0.215, 0.7],
    [0.16, 0.78],
    [0.095, NECK_Y + 0.005],
  ].map(([r, y]) => new Vector2(r, y))
  const g = paint(new LatheGeometry(profile, 40), (_x, y) => (y < top + 0.024 ? TRIM : MANTLE))
  const p = g.getAttribute('position')
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i)
    const y = p.getY(i)
    const z = p.getZ(i)
    const a = Math.atan2(z, x)
    const w = Math.max(0, 1 - (y - top) / 0.06)
    const points = Math.pow(Math.abs(Math.cos(a * 1.5)), 8) * 0.06
    p.setXYZ(i, x * 0.86, y - points * w, z * 1.03)
  }
  g.computeVertexNormals()
  return g
}

/** Hood: a rounded shape with a backward point and a deep, dark face cavity. */
function hoodGeometry(): BufferGeometry {
  const g = new SphereGeometry(0.16, 40, 28)
  const p = g.getAttribute('position')
  const front = [0.96, -0.28, 0]
  const colours: Color[] = []
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i)
    let y = p.getY(i)
    let z = p.getZ(i)
    const len = Math.hypot(x, y, z)
    const f = (x * front[0] + y * front[1] + z * front[2]) / len
    // Carve the face opening as a concave dish.
    if (f > OPEN) {
      const d = ((f - OPEN) / (1 - OPEN)) * 0.11
      x -= (x / len) * d
      y -= (y / len) * d
      z -= (z / len) * d
    }
    // Pull the crown back into a soft point that droops slightly.
    if (y > 0.02 && x < 0.02) {
      const k = (y - 0.02) * Math.max(0, 0.02 - x) * 5
      x -= k * 1.1
      y += k * 0.15
    }
    // A slight brim over the face opening keeps the face in shadow.
    if (f > OPEN - 0.2 && f <= OPEN && y > 0.02) x += 0.025 * (1 - Math.abs(f - (OPEN - 0.1)) / 0.1)
    p.setXYZ(i, x, y * 1.08, z * 0.94)
    colours.push(f > OPEN + 0.02 ? FACE : CLOAK)
  }
  g.computeVertexNormals()
  return paint(g, (() => {
    let i = 0
    return () => colours[i++]
  })())
}

/** One leg with its foot (pivot at the hip, foot pointing forward). */
function legGeometry(): BufferGeometry {
  const leg = new CylinderGeometry(0.05, 0.038, HIP_Y - 0.03, 8)
  leg.translate(0, -(HIP_Y - 0.03) / 2, 0)
  const foot = new RoundedBoxGeometry(0.13, 0.05, 0.08, 2, 0.02)
  foot.translate(0.035, -HIP_Y + 0.025, 0)
  return mergeGeometries([leg.toNonIndexed(), foot.toNonIndexed()])!
}

/** Ochre scarf: a wrap around the neck plus a tail that trails behind. */
function scarfGeometry() {
  const wrap = new TorusGeometry(0.085, 0.03, 8, 24)
  wrap.rotateX(Math.PI / 2)
  wrap.translate(0, NECK_Y - 0.02, 0)
  const tail = new BoxGeometry(0.035, 0.2, 0.07)
  tail.translate(0, -0.1, 0) // pivot at its top
  return { wrap, tail }
}

/** Crisp bone outline around the face opening (a separate thin ring reads cleaner than painted vertices). */
function rimGeometry(): BufferGeometry {
  // The opening edge sits where the face direction meets the sphere at cos = OPEN.
  const ring = new TorusGeometry(0.16 * Math.sqrt(1 - OPEN * OPEN) * 0.95, 0.007, 6, 40)
  ring.rotateY(Math.PI / 2) // ring plane faces +x
  ring.translate(0.16 * OPEN - 0.006, 0, 0)
  ring.rotateZ(-Math.atan2(0.28, 0.96)) // tilt with the face direction
  ring.scale(1, 1.08, 0.94) // match the hood's own scaling
  return ring
}

function eyesGeometry(): BufferGeometry {
  const a = new SphereGeometry(0.014, 8, 6)
  a.scale(0.7, 1.25, 1)
  a.translate(0, 0, 0.042)
  const b = a.clone().translate(0, 0, -0.084)
  return mergeGeometries([a, b])!
}

const EYE = new Color('#dff4ff')

/** v2 player: the hooded wanderer. Consumes sim.player and sim.guidePose only (drop-in for the shard). */
export function Wanderer() {
  const root = useRef<Group>(null)
  const body = useRef<Group>(null)
  const legL = useRef<Group>(null)
  const legR = useRef<Group>(null)
  const cloak = useRef<Group>(null)
  const head = useRef<Group>(null)
  const eyes = useRef<Mesh>(null)
  const tail = useRef<Group>(null)
  const shadow = useRef<Mesh>(null)
  const { playerLight } = useRenderBudget()
  const geo = useMemo(() => ({ cloak: cloakGeometry(), mantle: mantleGeometry(), hood: hoodGeometry(), leg: legGeometry(), scarf: scarfGeometry(), eyes: eyesGeometry(), rim: rimGeometry() }), [])
  const mats = useMemo(
    () => ({
      cloth: new MeshLambertMaterial({ vertexColors: true, side: DoubleSide }),
      legs: new MeshLambertMaterial({ color: '#25272e' }),
      scarf: new MeshLambertMaterial({ color: '#b5823f' }),
      rim: new MeshLambertMaterial({ color: TRIM }),
      eyes: new MeshBasicMaterial({ color: EYE.clone(), toneMapped: false }),
    }),
    [],
  )
  const tex = useMemo(() => radialShadowTexture(), [])
  const st = useRef({ phase: 0, last: null as null | { x: number; z: number }, gait: 0, headYaw: 0, nod: 0, blink: 0, nextBlink: 2.5, glance: 0 })

  useFrame(({ clock }, rawDt) => {
    const r = root.current
    if (!r || !body.current || !legL.current || !legR.current || !cloak.current || !head.current) return
    const dt = Math.min(rawDt, 0.1)
    const t = clock.elapsedTime
    const s = st.current
    const calm = reducedMotion() ? 0.35 : 1
    const { pos, vel, facing } = sim.player
    r.position.set(pos.x, 0, pos.z)
    r.rotation.y = -facing

    // Stride phase follows the distance actually walked, so feet don't slide (teleports are ignored).
    const moved = s.last ? Math.hypot(pos.x - s.last.x, pos.z - s.last.z) : 0
    s.last = { x: pos.x, z: pos.z }
    if (moved < 1) s.phase += (moved / STRIDE) * Math.PI * 2
    const speed = Math.hypot(vel.x, vel.z)
    s.gait += (Math.min(speed / 2.6, 1) - s.gait) * (1 - Math.exp(-dt * 10))
    const k = s.gait * calm
    const swing = Math.sin(s.phase) * 0.62 * k
    legL.current.rotation.z = swing
    legR.current.rotation.z = -swing

    // Body: a small double bob per stride, a forward lean with speed, breathing at rest.
    const b = body.current
    b.position.y = Math.abs(Math.sin(s.phase)) * 0.028 * k
    b.rotation.z = -0.13 * k
    const breathe = Math.sin(t * 1.7) * 0.01 * calm * (1 - s.gait)
    cloak.current.scale.set(1 + breathe * 0.5, 1 + breathe, 1 + breathe * 0.5)
    // The cloak lags behind the body and sways with the stride.
    cloak.current.rotation.z = 0.1 * k + Math.sin(s.phase * 2) * 0.025 * k
    cloak.current.rotation.x = Math.sin(s.phase) * 0.05 * k
    if (tail.current) {
      tail.current.rotation.z = 0.25 + 0.55 * k + Math.sin(t * 7 + s.phase) * 0.08 * k
      tail.current.rotation.x = Math.sin(t * 1.3) * 0.08 * calm
    }

    // Head: turns toward the kokedama when it's near; otherwise glances around slowly while idle.
    const gp = sim.guidePose
    const dx = gp.position.x - pos.x
    const dz = gp.position.z - pos.z
    const near = Math.hypot(dx, dz) < 5
    let want = near ? -(Math.atan2(dz, dx) - facing) : Math.sin(t * 0.35) * 0.45 * (1 - s.gait)
    want = Math.atan2(Math.sin(want), Math.cos(want))
    want = Math.max(-1, Math.min(1, want)) * calm
    s.headYaw += (want - s.headYaw) * (1 - Math.exp(-dt * 4))
    head.current.rotation.y = s.headYaw
    // A small nod when the kokedama greets; looking up a little toward it when it hovers close.
    s.nod += ((gp.state === 'greet' ? 1 : 0) - s.nod) * (1 - Math.exp(-dt * 6))
    head.current.rotation.z = (near ? 0.12 : 0) * calm - s.nod * Math.max(0, Math.sin(t * 9)) * 0.18 * calm

    // Eyes: blink every few seconds; brighten while the kokedama speaks.
    if (eyes.current) {
      if (t > s.nextBlink) {
        s.blink = 0.14
        s.nextBlink = t + 2.5 + ((t * 7.31) % 3)
      }
      s.blink = Math.max(0, s.blink - dt)
      eyes.current.scale.y = s.blink > 0 ? 0.15 : 1
      mats.eyes.color.copy(EYE).multiplyScalar(0.75 + gp.speakPulse * 0.6)
    }

    if (shadow.current) shadow.current.position.set(pos.x, 0.02, pos.z)
  })

  return (
    <>
      <group ref={root}>
        <group ref={body} name="v2-wanderer">
          {[0.068, -0.068].map((z, i) => (
            <group key={z} ref={i === 0 ? legL : legR} position={[0, HIP_Y, z]}>
              <mesh geometry={geo.leg} material={mats.legs} />
            </group>
          ))}
          <group ref={cloak} position={[0, NECK_Y, 0]}>
            <mesh geometry={geo.cloak} material={mats.cloth} position={[0, -NECK_Y, 0]} />
            <mesh geometry={geo.mantle} material={mats.cloth} position={[0, -NECK_Y, 0]} />
          </group>
          <mesh geometry={geo.scarf.wrap} material={mats.scarf} />
          <group ref={tail} position={[-0.07, NECK_Y - 0.03, 0.05]}>
            <mesh geometry={geo.scarf.tail} material={mats.scarf} />
          </group>
          <group ref={head} position={[0, NECK_Y + 0.11, 0]}>
            <mesh geometry={geo.hood} material={mats.cloth} />
            <mesh geometry={geo.rim} material={mats.rim} />
            <mesh ref={eyes} geometry={geo.eyes} material={mats.eyes} position={[0.075, -0.035, 0]} />
          </group>
        </group>
        {/* Always mounted: removing a light changes the light count and recompiles every lit shader. */}
        <pointLight position={[0, 1.7, 0]} intensity={playerLight ? 0.5 : 0} distance={3} color="#ffffff" />
      </group>
      <mesh ref={shadow} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
        <planeGeometry args={[0.95, 0.95]} />
        <meshBasicMaterial map={tex} color="black" transparent depthWrite={false} opacity={0.55} fog={false} />
      </mesh>
    </>
  )
}
