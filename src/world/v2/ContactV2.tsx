import { Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { BoxGeometry, Color, CylinderGeometry, Matrix4, MeshBasicMaterial, Quaternion, SphereGeometry, Vector3, type BufferGeometry, type InstancedMesh, type Mesh, type Object3D } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { cv } from '../../content/cv'
import type { IslandDef } from '../../content/world'
import { v } from '../../core/geometry'
import { IslandBase } from '../islands/IslandBase'
import { easeOutCubic, useReveal } from '../reveals/useReveal'
import { reducedMotion, sim } from '../sim'
import { TITLE_FONT } from '../space'
import { BlockShadows, SHADOW_SPREAD } from './BlockShadows'
import { concreteMaterial, fadingConcreteMaterial, syncFadeTransparency } from './concrete'
import { contactBase, contactStones } from './contactSignal'
import { guideCue } from './cues'

// Contact: the signal tower. Offset slabs spiral up a slender core to a dish aimed at the void, with a
// slowly blinking beacon at its focus. In front of the tower, one transmitter stone per public contact
// channel (engraved with the CV's own label and value), each wired to the tower by a cable of light.
// Approaching a stone sends a pulse up its cable. Location and availability are engraved on the
// station house at the tower's foot. Island-local space: +x points outward.

const T = { x: 2.4, z: 0 } // tower axis
const SLABS = 6
const SLAB = { len: 1.7, t: 0.3, d: 1.0, off: 0.45, y0: 0.95, step: 1.05, turn: 55 }
const CORE = { w: 0.55, h: 7.0 }
const HOUSE = { w: 1.5, h: 1.7, d: 0.9 } // the station house at the tower's foot
// Stones lean back so their faces catch the sky light and face the camera (upright faces sat in shade).
const STONE = { w: 1.25, h: 1.3, d: 0.22, r: 3.15, spread: 46, lean: deg(30) }
const DISH = { y: 7.25, r: 1.05, tilt: deg(55) }
const FIND_RANGE = 1.8
const PULSE_S = 1.2
const TEXT_RANGE = 16
const DIM = new Color('#34383d')
const LIT = new Color('#eef6e4')

function deg(d: number) {
  return (d * Math.PI) / 180
}

type Light = { matrix: Matrix4; base: number; stone?: number; reveal?: number; cable?: { from: Vector3; to: Vector3 } }

function slanted(from: Vector3, to: Vector3, w: number): Matrix4 {
  const dir = to.clone().sub(from)
  return new Matrix4().compose(from.clone().add(to).multiplyScalar(0.5), new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir.clone().normalize()), new Vector3(w, dir.length(), w))
}

function chamfered(w: number, h: number, d: number, x: number, y: number, z: number, yaw: number, r = 0.035): BufferGeometry {
  const g = new RoundedBoxGeometry(d, h, w, 1, Math.min(r, d / 2.2, h / 2.2, w / 2.2))
  g.rotateY(yaw)
  g.translate(x, y, z)
  g.deleteAttribute('uv')
  return g.toNonIndexed()
}

type Placed = { x: number; z: number; theta: number }

/** The stones fan out in front of the tower, toward the plaza. */
function stonePlaces(n: number): Placed[] {
  return Array.from({ length: n }, (_, k) => {
    // Mirrored so that, seen from the arrival ring, the stones read left to right in CV order.
    const theta = deg(180 - (k - (n - 1) / 2) * STONE.spread)
    return { x: T.x + STONE.r * Math.cos(theta), z: T.z + STONE.r * Math.sin(theta), theta }
  })
}

function buildTower(stones: Placed[], lights: Light[]) {
  const tower: BufferGeometry[] = []
  const proxy: BufferGeometry[] = []
  tower.push(chamfered(CORE.w, CORE.h, CORE.w, T.x, CORE.h / 2, T.z, 0))
  // The station house faces the plaza (-x); the base plinth is a low octagon.
  tower.push(chamfered(HOUSE.w, HOUSE.h, HOUSE.d, T.x - 0.25, HOUSE.h / 2, T.z, 0))
  const plinth = new CylinderGeometry(1.3, 1.38, 0.28, 8).translate(T.x, 0.14, T.z)
  plinth.deleteAttribute('uv')
  tower.push(plinth.toNonIndexed())
  proxy.push(new BoxGeometry(1.4, CORE.h, 1.4).translate(T.x, CORE.h / 2, T.z))
  for (let k = 0; k < SLABS; k++) {
    const phi = deg(k * SLAB.turn + 20)
    const cx = T.x + SLAB.off * Math.cos(phi)
    const cz = T.z + SLAB.off * Math.sin(phi)
    const y = SLAB.y0 + k * SLAB.step
    // Cantilevered slab, its long axis pointing out from the core.
    tower.push(chamfered(SLAB.d, SLAB.t, SLAB.len, cx, y, cz, -phi))
    proxy.push(new BoxGeometry(SLAB.len, SLAB.t, SLAB.d).rotateY(-phi).translate(cx, y, cz))
    // A light strip on each slab's tip: the first-visit reveal lights them bottom to top.
    const tip = SLAB.off + SLAB.len / 2 + 0.006
    lights.push({ matrix: new Matrix4().compose(new Vector3(T.x + tip * Math.cos(phi), y, T.z + tip * Math.sin(phi)), new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), -phi), new Vector3(0.02, SLAB.t * 0.45, SLAB.d - 0.15)), base: 0.15, reveal: k })
  }
  // Cables of light from each stone's transmitter to the tower, and guy lines to the island's edge.
  const anchor = (k: number) => new Vector3(T.x + 0.3 * Math.cos(deg(180 + k * 40)), 5.4 - k * 0.25, T.z + 0.3 * Math.sin(deg(180 + k * 40)))
  stones.forEach((s, k) => {
    const from = stoneTop(s)
    const to = anchor(k - (stones.length - 1) / 2)
    lights.push({ matrix: slanted(from, to, 0.016), base: 0.18, stone: k })
    lights.push({ matrix: new Matrix4().makeScale(1e-4, 1e-4, 1e-4), base: 1, stone: k, cable: { from, to } }) // its travelling pulse
  })
  for (const a of [-50, 0, 50]) {
    const edge = new Vector3(5.75 * Math.cos(deg(a)), 0.05, 5.75 * Math.sin(deg(a)))
    lights.push({ matrix: slanted(new Vector3(T.x, 6.55, T.z), edge, 0.008), base: 0.1 })
  }
  return { tower: mergeGeometries(tower, false)!, proxy: mergeGeometries(proxy.map((p) => (p.deleteAttribute('uv'), p.toNonIndexed())), false)! }
}

/** Where a leaning stone's top ends up, in island space (the cable leaves from there). */
function stoneTop(s: Placed): Vector3 {
  const back = -STONE.h * Math.sin(STONE.lean) // leaning away from the plaza, toward the tower
  return new Vector3(s.x + Math.cos(s.theta) * back, STONE.h * Math.cos(STONE.lean) + 0.1, s.z + Math.sin(s.theta) * back)
}

function buildStones(stones: Placed[]): BufferGeometry {
  const parts: BufferGeometry[] = []
  for (const s of stones) {
    // Built upright in the stone's frame (+x toward the plaza), leaned back about its bottom edge,
    // then turned to face the plaza and placed.
    for (const g of [new RoundedBoxGeometry(STONE.d, STONE.h, STONE.w, 1, 0.03).translate(0, STONE.h / 2, 0), new RoundedBoxGeometry(0.28, 0.14, 0.28, 1, 0.02).translate(0, STONE.h + 0.07, 0)]) {
      g.rotateZ(STONE.lean)
      g.rotateY(-s.theta)
      g.translate(s.x, 0, s.z)
      g.deleteAttribute('uv')
      parts.push(g.toNonIndexed())
    }
  }
  return mergeGeometries(parts, false)!
}

/** The dish: a shallow concrete cap at the top, aimed outward and up at the void. */
function dishGeometry(): BufferGeometry {
  const g = new SphereGeometry(DISH.r, 32, 10, 0, Math.PI * 2, 0, 0.95)
  g.translate(0, -DISH.r, 0) // rim at the origin, bowl opening upward
  g.rotateZ(-DISH.tilt) // aim outward (+x) and up
  g.translate(T.x + 0.25, DISH.y, T.z)
  g.deleteAttribute('uv')
  return g
}

/** Text rotation that turns its +z face toward bearing theta. */
const faceToward = (theta: number) => Math.atan2(Math.cos(theta), Math.sin(theta))

export function ContactV2({ island }: { island: IslandDef }) {
  const progress = useReveal(island.id)
  const stones = useMemo(() => contactStones(cv.contact.channels), [])
  const baseLines = useMemo(() => contactBase(cv.contact), [])
  const places = useMemo(() => stonePlaces(stones.length), [stones])
  const built = useMemo(() => {
    const lights: Light[] = []
    const t = buildTower(places, lights)
    return { ...t, stones: buildStones(places), dish: dishGeometry(), lights }
  }, [places])
  const towerMat = useMemo(() => fadingConcreteMaterial('#ebe7df'), [])
  const lightGeo = useMemo(() => new BoxGeometry(1, 1, 1), [])
  const lightMat = useMemo(() => new MeshBasicMaterial({ color: '#ffffff', toneMapped: false }), [])
  const beaconMat = useMemo(() => new MeshBasicMaterial({ color: '#f2fbe9', toneMapped: false }), [])
  const lightsRef = useRef<InstancedMesh>(null)
  const pads = useRef<InstancedMesh>(null)
  const beacon = useRef<Mesh>(null)
  const texts = useRef<Object3D[]>([])
  const col = useMemo(() => new Color(), [])
  const state = useRef({ found: stones.map(() => false), pulseT: stones.map(() => -1), lit: stones.map(() => 0), key: '' })
  const outward = v.angleOf(island.centre)
  const beaconPos = useMemo(() => new Vector3(T.x + 0.25, DISH.y, T.z).add(new Vector3(Math.sin(DISH.tilt), Math.cos(DISH.tilt), 0).multiplyScalar(0.55)), [])

  useLayoutEffect(() => {
    const m = lightsRef.current
    if (m) {
      built.lights.forEach((l, i) => {
        m.setMatrixAt(i, l.matrix)
        m.setColorAt(i, col.copy(DIM).lerp(LIT, l.base)) // colours exist before the precompile
      })
      m.instanceMatrix.needsUpdate = true
      if (m.instanceColor) m.instanceColor.needsUpdate = true
    }
    const p = pads.current
    if (p) {
      const o = new Matrix4()
      p.setMatrixAt(0, o.compose(new Vector3(T.x, 0.012, T.z), new Quaternion(), new Vector3(2.8 + SHADOW_SPREAD, 1, 2.8 + SHADOW_SPREAD)))
      places.forEach((s, k) =>
        p.setMatrixAt(k + 1, o.compose(new Vector3(s.x, 0.012, s.z), new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), -s.theta), new Vector3(STONE.d + SHADOW_SPREAD * 2, 1, STONE.w + SHADOW_SPREAD * 2))),
      )
      p.instanceMatrix.needsUpdate = true
    }
  }, [built, col, places])

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.1)
    const t = clock.elapsedTime
    const st = state.current
    syncFadeTransparency([towerMat])
    const p = progress.current
    // Discovery: approaching a stone (per visit) sends a pulse up its cable and cues the kokedama.
    const dx = sim.player.pos.x - island.centre.x
    const dz = sim.player.pos.z - island.centre.z
    const lx = dx * Math.cos(outward) + dz * Math.sin(outward)
    const lz = -dx * Math.sin(outward) + dz * Math.cos(outward)
    places.forEach((s, k) => {
      if (!st.found[k] && Math.hypot(lx - s.x, lz - s.z) < FIND_RANGE) {
        st.found[k] = true
        st.pulseT[k] = 0
        guideCue.seq++
      }
      if (st.pulseT[k] >= 0) st.pulseT[k] += dt
      st.lit[k] += ((st.found[k] && st.pulseT[k] > PULSE_S ? 1 : 0) - st.lit[k]) * (1 - Math.exp(-dt * 4))
    })
    const pulsing = st.pulseT.some((x) => x >= 0 && x <= PULSE_S + 0.1)
    // The first-visit reveal lights the slab tips from the bottom up, then the beacon ignites.
    const rise = reducedMotion() ? (p > 0 ? SLABS : 0) : Math.floor(easeOutCubic(p * 1.2) * (SLABS + 0.99))
    const visible = towerMat.opacity > 0.5
    const key = `${rise}|${visible ? 1 : 0}|${st.lit.map((x) => x.toFixed(3)).join(',')}`
    const m = lightsRef.current
    if (m && (key !== st.key || pulsing)) {
      st.key = key
      built.lights.forEach((l, i) => {
        let mat = l.matrix
        let b = l.base
        if (l.reveal !== undefined) b = l.reveal < rise ? 1 : 0.15
        if (l.stone !== undefined && !l.cable) b = l.base + st.lit[l.stone] * (1 - l.base)
        if (l.cable && l.stone !== undefined) {
          // The pulse: a short bright segment climbing the cable from the stone to the tower.
          const u = st.pulseT[l.stone]
          if (u < 0 || u > PULSE_S) mat = HIDDEN
          else {
            const a = l.cable.from.clone().lerp(l.cable.to, Math.max(0, u / PULSE_S - 0.06))
            const c = l.cable.from.clone().lerp(l.cable.to, Math.min(1, u / PULSE_S + 0.06))
            mat = slanted(a, c, 0.04)
          }
        }
        if (!visible && l.stone === undefined) mat = HIDDEN // tower lights fade with the tower
        m.setMatrixAt(i, mat)
        m.setColorAt(i, col.copy(DIM).lerp(LIT, b))
      })
      m.instanceMatrix.needsUpdate = true
      if (m.instanceColor) m.instanceColor.needsUpdate = true
    }
    // The beacon: dark until the reveal completes, then a slow blink (steady under reduced motion).
    if (beacon.current) {
      const on = rise >= SLABS
      beacon.current.visible = on && visible
      const k = reducedMotion() ? 0.8 : 0.55 + 0.45 * Math.max(0, Math.sin(t * 1.6))
      beaconMat.color.copy(LIT).multiplyScalar(k)
    }
    const near = Math.hypot(dx, dz) < TEXT_RANGE
    for (const o of texts.current) o.visible = near
  })

  const keep = (o: Object3D | null) => {
    if (o && !texts.current.includes(o)) texts.current.push(o)
  }

  return (
    <IslandBase island={island}>
      <mesh name="v2-signal-tower" geometry={built.tower} material={towerMat} />
      <mesh geometry={built.proxy} material={towerMat} visible={false} userData={{ blocksCamera: true, fadeOnBlock: true }} />
      <mesh name="v2-dish" geometry={built.dish} material={concreteMaterial('#e6e2d9', { side: 2 })} />
      <mesh ref={beacon} position={beaconPos} material={beaconMat} visible={false}>
        <sphereGeometry args={[0.11, 16, 12]} />
      </mesh>
      <mesh name="v2-stones" geometry={built.stones} material={concreteMaterial('#e2ded5')} />
      <instancedMesh name="v2-signal-lights" ref={lightsRef} args={[lightGeo, lightMat, built.lights.length]} />
      <BlockShadows ref={pads} count={places.length + 1} />
      {/* Location and availability, engraved on the station house, facing the plaza. */}
      <group position={[T.x - 0.25 - HOUSE.d / 2 - 0.012, 0, T.z]} rotation={[0, faceToward(Math.PI), 0]}>
        {baseLines[0] && (
          <Text name="v2-engraving" ref={keep} font={TITLE_FONT} position={[0, HOUSE.h - 0.24, 0]} fontSize={0.16} color="#4b4842" anchorX="center" anchorY="middle" maxWidth={HOUSE.w - 0.15}>
            {baseLines[0]}
          </Text>
        )}
        {baseLines[1] && (
          <Text name="v2-engraving" ref={keep} font={TITLE_FONT} position={[0, HOUSE.h - 0.42, 0]} fontSize={0.08} lineHeight={1.25} color="#5d5951" anchorX="center" anchorY="top" textAlign="center" maxWidth={HOUSE.w - 0.2}>
            {baseLines[1]}
          </Text>
        )}
      </group>
      {/* Each channel on its stone: the CV's label and value. */}
      {stones.map((s, k) => {
        const pl = places[k]
        return (
          <group key={s.label} position={[pl.x, 0, pl.z]} rotation={[0, -pl.theta, 0]}>
            <group rotation={[0, 0, STONE.lean]}>
              <group position={[STONE.d / 2 + 0.012, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                <Text name="v2-engraving" ref={keep} font={TITLE_FONT} position={[0, 0.95, 0]} fontSize={0.19} color="#45423c" anchorX="center" anchorY="bottom">
                  {s.label}
                </Text>
                <Text name="v2-engraving" ref={keep} font={TITLE_FONT} position={[0, 0.86, 0]} fontSize={0.1} lineHeight={1.2} color="#4f4c46" anchorX="center" anchorY="top" textAlign="center" maxWidth={STONE.w - 0.12} overflowWrap="break-word">
                  {s.value}
                </Text>
              </group>
            </group>
          </group>
        )
      })}
    </IslandBase>
  )
}

const HIDDEN = new Matrix4().makeScale(1e-4, 1e-4, 1e-4)
