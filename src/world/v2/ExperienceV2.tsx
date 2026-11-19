import { Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { BoxGeometry, Color, CylinderGeometry, ExtrudeGeometry, IcosahedronGeometry, Matrix4, MeshBasicMaterial, MeshLambertMaterial, Object3D, RingGeometry, Shape, TorusGeometry, Vector3, type BufferGeometry, type InstancedMesh } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { cv } from '../../content/cv'
import type { IslandDef } from '../../content/world'
import { v } from '../../core/geometry'
import { IslandBase } from '../islands/IslandBase'
import { useReveal } from '../reveals/useReveal'
import { sim } from '../sim'
import { TITLE_FONT } from '../space'
import { BlockShadows, SHADOW_SPREAD } from './BlockShadows'
import { concreteMaterial, fadingConcreteMaterial, syncFadeTransparency } from './concrete'
import { guideCue } from './cues'
import { experienceChapters } from './experienceChapters'
import { findPoint, FIND_RANGE, FLOOR_CENTRE, FLOOR_RING, OASIS_PLATE, spoke, stationPoint, stations, studioDoor, type Station } from './experienceLayout'

// Experience as the Memory Foundry: one workstation per career chapter around a shared open floor, with
// Sämmi Studios, the newest, as the warm anchor at the back. Every station is built from one kit:
// an ivory plinth with a charcoal edge band, a charcoal bench under an ivory worktop, a tilted plate with
// the chapter's name, role and dates, and a pilot light. Only the machine on it differs. An inlaid ring
// on the floor ties the stations together; walking up to a station discovers it, and its inlay from
// the ring lights. Warm light belongs to the studio alone.
//
// Station-local space: x = u (out of the station's front), y up, z = v (across).

const DIM = new Color('#34383d')
const LIT = new Color('#eef6e4')
const WARM = new Color('#ffd9a0')
const TEXT_RANGE = 18
const PLINTH = 0.12
const BENCH_H = 0.9
const PLATE = { tilt: (35 * Math.PI) / 180, h: 0.46 }

export type Light = {
  pos: [number, number, number]
  size: [number, number, number]
  portal: number
  kind: 'reveal' | 'discover' | 'warm'
  base: number
  yaw?: number
  roll?: number
  /** Shown only once its station is discovered (the floor inlays' light). */
  untilFound?: boolean
}
type LocalLight = Omit<Light, 'portal' | 'yaw'>
/** Where a station's plate stands (station-local), and how wide it is. */
type PlateSpec = { u: number; v: number; y: number; w: number }

function stationMatrix(s: Pick<Station, 'spec' | 'facing'>): Matrix4 {
  return new Matrix4().makeRotationY(-s.facing).setPosition(s.spec.x, 0, s.spec.z)
}

function ready(g: BufferGeometry): BufferGeometry {
  const out = g.index ? g.toNonIndexed() : g
  if (out.getAttribute('uv')) out.deleteAttribute('uv')
  return out
}

/** A softly chamfered box from station-local extents. */
function box(u0: number, u1: number, y0: number, y1: number, v0: number, v1: number, r = 0.025): BufferGeometry {
  const g = new RoundedBoxGeometry(u1 - u0, y1 - y0, v1 - v0, 1, Math.min(r, (u1 - u0) / 2.2, (y1 - y0) / 2.2, (v1 - v0) / 2.2))
  return ready(g.translate((u0 + u1) / 2, (y0 + y1) / 2, (v0 + v1) / 2))
}

/** A profile in the (u, y) plane extruded across v0..v1. */
function prism(points: [number, number][], v0: number, v1: number): BufferGeometry {
  const s = new Shape()
  points.forEach(([u, y], i) => (i === 0 ? s.moveTo(u, y) : s.lineTo(u, y)))
  s.closePath()
  const g = new ExtrudeGeometry(s, { depth: v1 - v0, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 1 })
  return ready(g.translate(0, 0, v0))
}

/** A shape in the (v, y) plane extruded along u, from u0 back to u0 - depth (for arches facing the front). */
function facade(shape: Shape, u0: number, depth: number): BufferGeometry {
  const g = new ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 1, curveSegments: 24 })
  g.rotateY(-Math.PI / 2) // shape x → v (z), extrusion → -u
  return ready(g.translate(u0, 0, 0))
}

type Parts = { ivory: BufferGeometry[]; charcoal: BufferGeometry[]; lights: LocalLight[]; plate: PlateSpec | null; hull: number }

/** One station, in station-local space, built from the shared kit plus its own machine. */
function stationParts(s: Station): Parts {
  const { hu, hv } = s.spec
  const ivory: BufferGeometry[] = []
  const charcoal: BufferGeometry[] = []
  const lights: LocalLight[] = []
  const light = (u: number, y: number, vv: number, su: number, sy: number, sv: number, kind: Light['kind'], base: number, roll = 0) =>
    lights.push({ pos: [u, y, vv], size: [su, sy, sv], kind, base, roll })

  // The kit. A plinth with a charcoal band along its front edge.
  const plinth = () => {
    ivory.push(box(-hu, hu, 0, PLINTH, -hv, hv, 0.03))
    charcoal.push(box(hu - 0.012, hu + 0.012, 0.035, 0.085, -hv + 0.06, hv - 0.06, 0.005))
  }
  // A bench: charcoal body under an ivory worktop that overhangs it a little.
  const bench = (u0: number, u1: number, v0: number, v1: number) => {
    charcoal.push(box(u0 + 0.03, u1 - 0.03, PLINTH, BENCH_H - 0.05, v0 + 0.03, v1 - 0.03))
    ivory.push(box(u0, u1, BENCH_H - 0.05, BENCH_H, v0, v1, 0.015))
    // Its pilot light, along the worktop's front edge: dim until the station is discovered.
    light(u1 + 0.004, BENCH_H - 0.025, (v0 + v1) / 2, 0.008, 0.012, Math.max(0.2, v1 - v0 - 0.3), 'discover', 0.12)
  }
  // The plate on a bench's front edge, tilted up toward the trailing camera.
  const plateOn = (uFront: number, vc: number, w: number): PlateSpec => {
    const u = uFront - 0.2
    const y = BENCH_H + 0.03 + (PLATE.h / 2) * Math.cos(PLATE.tilt)
    ivory.push(ready(new BoxGeometry(0.03, PLATE.h, w).rotateZ(PLATE.tilt).translate(u, y, vc)))
    return { u, v: vc, y, w }
  }

  switch (s.kind) {
    case 'medrick': {
      // Game development: an arcade cabinet (control deck, slanted screen, marquee) beside a bench
      // carrying four cartridges, one per released title.
      plinth()
      const v0 = -hv + 0.05
      const v1 = -0.02
      ivory.push(
        prism(
          [
            [-hu + 0.05, PLINTH],
            [0.05, PLINTH],
            [0.05, 0.95],
            [0.28, 1.04],
            [0.28, 1.12],
            [0.05, 1.18],
            [-0.08, 1.86],
            [0.08, 1.95],
            [0.08, 2.18],
            [-hu + 0.05, 2.18],
          ],
          v0,
          v1,
        ),
      )
      const screen = new BoxGeometry(0.03, 0.6, v1 - v0 - 0.12).rotateZ(Math.atan2(0.13, 0.68)).translate(-0.005, 1.52, (v0 + v1) / 2)
      charcoal.push(ready(screen))
      light(0.1, 1.97, (v0 + v1) / 2, 0.01, 0.12, v1 - v0 - 0.2, 'discover', 0.15) // the marquee
      bench(-0.2, hu - 0.02, 0.05, hv - 0.05)
      for (let k = 0; k < 4; k++) charcoal.push(box(-0.12, 0.08, BENCH_H, BENCH_H + 0.2, 0.12 + k * 0.15, 0.22 + k * 0.15, 0.01))
      for (let k = 0; k < 4; k++) light(0.085, BENCH_H + 0.15, 0.17 + k * 0.15, 0.008, 0.05, 0.06, 'discover', 0.12)
      return { ivory, charcoal, lights, plate: plateOn(hu - 0.02, (0.05 + hv - 0.05) / 2, 0.66), hull: 2.2 }
    }
    case 'tutor': {
      // Teaching: a small barrel-vaulted alcove with a dark board on its back wall and a lectern.
      plinth()
      const half = hv
      const spring = 1.7
      const back = new Shape()
      back.moveTo(-half, PLINTH).lineTo(half, PLINTH).lineTo(half, spring).absarc(0, spring, half, 0, Math.PI, false).lineTo(-half, PLINTH)
      ivory.push(facade(back, -hu + 0.14, 0.14))
      const vault = new Shape()
      vault.moveTo(half, spring).absarc(0, spring, half, 0, Math.PI, false).lineTo(-half + 0.12, spring)
      vault.absarc(0, spring, half - 0.12, Math.PI, 0, true) // the vault's underside, back across
      vault.lineTo(half, spring)
      ivory.push(facade(vault, 0.3, 0.3 + hu - 0.14))
      for (const side of [-1, 1]) ivory.push(box(-hu, 0.3, PLINTH, spring, side < 0 ? -half : half - 0.12, side < 0 ? -half + 0.12 : half))
      charcoal.push(box(-hu + 0.14, -hu + 0.17, 0.95, 1.6, -0.42, 0.42, 0.005)) // the board
      light(-hu + 0.175, 1.62, 0, 0.006, 0.012, 0.7, 'discover', 0.15)
      bench(0.0, hu - 0.02, -0.4, 0.4) // the lectern
      return { ivory, charcoal, lights, plate: plateOn(hu - 0.02, 0, 0.74), hull: spring + half }
    }
    case 'ubicomp': {
      // Research: a long console with a monitor, and behind it an array of sensor masts on a rail.
      plinth()
      bench(-0.05, hu - 0.02, -hv + 0.08, hv - 0.08)
      charcoal.push(ready(new BoxGeometry(0.03, 0.34, 0.85).rotateZ(-0.2).translate(0.02, BENCH_H + 0.2, -0.2)))
      const masts = 5
      ivory.push(box(-0.42, -0.36, 1.15, 1.21, -hv + 0.12, hv - 0.12, 0.01)) // the rail
      for (let k = 0; k < masts; k++) {
        const vv = -hv + 0.15 + (k * (hv * 2 - 0.3)) / (masts - 1)
        const h = 1.55 + ((k * 37) % 5) * 0.12
        ivory.push(box(-0.43, -0.35, PLINTH, h, vv - 0.04, vv + 0.04, 0.01))
        charcoal.push(box(-0.46, -0.32, h, h + 0.12, vv - 0.07, vv + 0.07, 0.015))
        light(-0.315, h + 0.06, vv, 0.006, 0.03, 0.05, 'discover', 0.12)
      }
      return { ivory, charcoal, lights, plate: plateOn(hu - 0.02, 0.0, 0.9), hull: 2.3 }
    }
    case 'oasis': {
      // Immersive technology: a round pad with a seat, facing a ring of light floating in front of a
      // second, finer ring (a lens over a lens). Its plate stands on a pedestal beside the way in.
      ivory.push(ready(new CylinderGeometry(hu, hu, 0.06, 48).translate(0, 0.03, 0)))
      charcoal.push(ready(new CylinderGeometry(hu + 0.03, hu + 0.03, 0.025, 48).translate(0, 0.0125, 0))) // edge band
      charcoal.push(box(-0.7, -0.2, 0.06, 0.45, -0.28, 0.28))
      ivory.push(ready(new TorusGeometry(0.85, 0.07, 10, 48).rotateY(Math.PI / 2).translate(0.15, 2.0, 0)))
      ivory.push(ready(new TorusGeometry(0.98, 0.025, 6, 48).rotateY(Math.PI / 2).translate(-0.05, 2.0, 0)))
      for (let k = 0; k < 18; k++) {
        const t = (k / 18) * Math.PI * 2
        light(0.23, 2.0 + 0.85 * Math.sin(t), 0.85 * Math.cos(t), 0.03, 0.04, 0.04, 'discover', 0.12)
      }
      const p = OASIS_PLATE
      charcoal.push(box(p.u - 0.2, p.u + 0.2, 0.06, BENCH_H - 0.05, p.v - 0.33, p.v + 0.33))
      ivory.push(box(p.u - 0.24, p.u + 0.24, BENCH_H - 0.05, BENCH_H, p.v - 0.37, p.v + 0.37, 0.015))
      return { ivory, charcoal, lights, plate: plateOn(p.u + 0.24, p.v, 0.7), hull: 2.95 }
    }
    case 'arvo': {
      // Robotics: an articulated arm on a turntable reaching over its bench, a gripper closing on a part.
      plinth()
      bench(0.0, hu - 0.02, -hv + 0.08, 0.25)
      const base = { u: -0.25, v: 0.5 }
      ivory.push(ready(new CylinderGeometry(0.28, 0.32, 0.22, 24).translate(base.u, PLINTH + 0.11, base.v)))
      charcoal.push(ready(new CylinderGeometry(0.14, 0.16, 0.5, 16).translate(base.u, PLINTH + 0.47, base.v)))
      const shoulder = new Vector3(base.u, PLINTH + 0.75, base.v)
      const elbow = new Vector3(base.u + 0.2, 2.25, base.v - 0.2)
      const wrist = new Vector3(0.22, 1.4, -0.6) // over the far end of the bench, clear of the plate
      const limb = (a: Vector3, b: Vector3, t: number) => {
        const d = new Vector3().subVectors(b, a)
        const g = new BoxGeometry(t, d.length(), t * 0.85)
        const m = new Matrix4().lookAt(a, b, new Vector3(0, 1, 0))
        g.rotateX(Math.PI / 2).applyMatrix4(m).translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2)
        return ready(g)
      }
      charcoal.push(limb(shoulder, elbow, 0.17), limb(elbow, wrist, 0.13))
      ivory.push(ready(new CylinderGeometry(0.13, 0.13, 0.22, 16).rotateX(Math.PI / 2).translate(elbow.x, elbow.y, elbow.z)))
      ivory.push(ready(new CylinderGeometry(0.1, 0.1, 0.16, 16).translate(wrist.x, wrist.y + 0.02, wrist.z)))
      for (const side of [-1, 1]) charcoal.push(box(wrist.x - 0.03, wrist.x + 0.03, wrist.y - 0.32, wrist.y - 0.06, wrist.z + side * 0.07 - 0.02, wrist.z + side * 0.07 + 0.02, 0.008))
      ivory.push(box(wrist.x - 0.09, wrist.x + 0.09, BENCH_H, BENCH_H + 0.14, wrist.z - 0.09, wrist.z + 0.09, 0.015)) // the part
      light(elbow.x, elbow.y, elbow.z + 0.115, 0.06, 0.06, 0.008, 'discover', 0.2)
      return { ivory, charcoal, lights, plate: plateOn(hu - 0.02, -0.05, 0.56), hull: 2.45 }
    }
    case 'sammi': {
      // The indie studio: a hall under a sawtooth roof whose glazing faces the floor, a loft with a
      // forward-pitched roof, a canopied door, warm windows front and back.
      plinth()
      const hallV0 = -hv
      const hallV1 = 0.35
      const H = 2.9
      ivory.push(box(-hu, hu, PLINTH, H, hallV0, hallV1, 0.03))
      const d = hu
      for (let k = 0; k < 2; k++) {
        const a = -hu + k * d
        const b = a + d
        ivory.push(prism([[a, H], [b, H], [b, H + 0.55]], hallV0, hallV1))
        light(b + 0.012, H + 0.27, (hallV0 + hallV1) / 2, 0.01, 0.38, hallV1 - hallV0 - 0.3, 'warm', 0.8)
      }
      ivory.push(box(-hu, 0.7, PLINTH, 3.55, hallV1, hv, 0.03)) // the loft
      ivory.push(prism([[-hu - 0.05, 3.55], [0.85, 3.55], [0.85, 4.15], [-hu - 0.05, 3.8]], hallV1 - 0.05, hv + 0.05))
      light(0.712, 2.2, (hallV1 + hv) / 2, 0.01, 2.0, 0.12, 'warm', 0.85) // the loft's slit window
      charcoal.push(box(hu - 0.01, hu + 0.015, PLINTH, 2.1, -0.75, 0.05, 0.005)) // the door
      light(hu + 0.02, 1.1, -0.35, 0.006, 1.85, 0.7, 'warm', 0.6)
      ivory.push(box(hu - 0.05, hu + 0.45, 2.16, 2.26, -0.95, 0.25, 0.02)) // the canopy
      light(hu + 0.012, 1.4, -1.0, 0.01, 1.0, 0.36, 'warm', 0.85) // the workshop window
      for (const vv of [-0.85, -0.15]) light(-hu - 0.012, 1.6, vv, 0.01, 1.2, 0.3, 'warm', 0.75) // back windows
      return { ivory, charcoal, lights, plate: null, hull: 4.2 }
    }
  }
}

/** Moss at the OASIS pad's edge, the kokedama's kind at home. */
function mossGeometry(s: Station): BufferGeometry {
  const parts = [
    [0.55, -0.6, 0.15],
    [0.68, -0.45, 0.1],
    [0.4, -0.75, 0.08],
  ].map(([u, vv, r]) => new IcosahedronGeometry(r, 1).scale(1, 0.55, 1).translate(u, 0.06 + r * 0.25, vv).toNonIndexed())
  return mergeGeometries(parts, false)!.applyMatrix4(stationMatrix(s))
}

/** A flush floor strip from a to b (island-local), as a box geometry and its matching light. */
function strip(a: { x: number; z: number }, b: { x: number; z: number }, w: number) {
  const dx = b.x - a.x
  const dz = b.z - a.z
  const len = Math.hypot(dx, dz)
  const yaw = -Math.atan2(dz, dx)
  const g = new BoxGeometry(len, 0.006, w).rotateY(yaw).translate((a.x + b.x) / 2, 0.004, (a.z + b.z) / 2)
  g.deleteAttribute('uv')
  return { geo: g.toNonIndexed(), pos: [(a.x + b.x) / 2, 0.009, (a.z + b.z) / 2] as [number, number, number], len, yaw }
}

export function ExperienceV2({ island }: { island: IslandDef }) {
  const progress = useReveal(island.id)
  const list = useMemo(() => stations(experienceChapters(cv.experience.entries)), [])
  const built = useMemo(() => {
    const charcoal: BufferGeometry[] = []
    const inlay: BufferGeometry[] = []
    const lights: Light[] = []
    const plates: (PlateSpec | null)[] = []
    const ivory = list.map((s, i) => {
      const m = stationMatrix(s)
      const p = stationParts(s)
      plates.push(p.plate)
      for (const g of p.charcoal) charcoal.push(g.applyMatrix4(m))
      for (const l of p.lights) {
        const at = new Vector3(...l.pos).applyMatrix4(m)
        lights.push({ ...l, pos: [at.x, at.y, at.z], yaw: -s.facing, portal: i })
      }
      const hull = new BoxGeometry(s.spec.hu * 2, p.hull, s.spec.hv * 2).translate(0, p.hull / 2, 0)
      hull.deleteAttribute('uv')
      return { geo: mergeGeometries(p.ivory.map((g) => g.applyMatrix4(m)), false)!, proxy: hull.toNonIndexed().applyMatrix4(m), mat: fadingConcreteMaterial('#ebe7df') }
    })
    // The shared floor: an inlaid ring on the open floor, and an inlay from it to every station. A
    // station's inlay lights once it is discovered; the studio's is always warm.
    const ring = new RingGeometry(FLOOR_RING.r - FLOOR_RING.w / 2, FLOOR_RING.r + FLOOR_RING.w / 2, 96).rotateX(-Math.PI / 2).translate(FLOOR_CENTRE.x, 0.005, FLOOR_CENTRE.z)
    ring.deleteAttribute('uv')
    inlay.push(ring.toNonIndexed())
    list.forEach((s, i) => {
      const target = s.kind === 'sammi' ? studioDoor() : findPoint(s)
      const sp = spoke(target)
      const st = strip(sp.from, sp.to, 0.05)
      inlay.push(st.geo)
      lights.push(
        s.kind === 'sammi'
          ? { pos: st.pos, size: [st.len, 0.004, 0.022], portal: i, kind: 'warm', base: 0.55, yaw: st.yaw }
          : { pos: st.pos, size: [st.len, 0.004, 0.022], portal: i, kind: 'discover', base: 0.55, yaw: st.yaw, untilFound: true },
      )
    })
    const oasis = list.find((s) => s.kind === 'oasis')
    return {
      ivory,
      charcoal: mergeGeometries(charcoal, false)!,
      inlay: mergeGeometries(inlay, false)!,
      lights,
      plates,
      moss: oasis ? mossGeometry(oasis) : null,
      finds: list.map(findPoint),
    }
  }, [list])
  const charcoalMat = useMemo(() => concreteMaterial('#3e4045'), [])
  const inlayMat = useMemo(() => concreteMaterial('#bdb7ac'), [])
  const mossMat = useMemo(() => new MeshLambertMaterial({ color: '#5f9a34', emissive: new Color('#1e3d0d'), emissiveIntensity: 0.5 }), [])
  const lightGeo = useMemo(() => new BoxGeometry(1, 1, 1), [])
  const lightMat = useMemo(() => new MeshBasicMaterial({ color: '#ffffff', toneMapped: false }), [])
  const lightsRef = useRef<InstancedMesh>(null)
  const pads = useRef<InstancedMesh>(null)
  const texts = useRef<(Object3D | null)[]>([])
  const state = useRef({ discovered: list.map(() => 0), found: list.map(() => false), near: false, lightKey: '' })
  const tmp = useMemo(() => new Object3D(), [])
  const col = useMemo(() => new Color(), [])
  const outward = v.angleOf(island.centre)

  useLayoutEffect(() => {
    const m = lightsRef.current
    if (!m) return
    built.lights.forEach((l, i) => m.setColorAt(i, lightColour(l, 0, col)))
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [built, col])

  useLayoutEffect(() => {
    const p = pads.current
    if (!p) return
    list.forEach((s, i) => {
      tmp.position.set(s.spec.x, 0.012, s.spec.z)
      tmp.rotation.set(0, -s.facing, 0)
      tmp.scale.set(s.spec.hu * 2 + SHADOW_SPREAD * 2, 1, s.spec.hv * 2 + SHADOW_SPREAD * 2)
      tmp.updateMatrix()
      p.setMatrixAt(i, tmp.matrix)
    })
    p.instanceMatrix.needsUpdate = true
  }, [list, tmp])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1)
    const st = state.current
    syncFadeTransparency(built.ivory.map((b) => b.mat))
    const dx = sim.player.pos.x - island.centre.x
    const dz = sim.player.pos.z - island.centre.z
    const lx = dx * Math.cos(outward) + dz * Math.sin(outward)
    const lz = -dx * Math.sin(outward) + dz * Math.cos(outward)
    // Walking up to a station for the first time per visit discovers that chapter.
    list.forEach((_, i) => {
      const f = built.finds[i]
      if (!st.found[i] && Math.hypot(lx - f.x, lz - f.z) < FIND_RANGE) {
        st.found[i] = true
        guideCue.seq++
      }
      st.discovered[i] += ((st.found[i] ? 1 : 0) - st.discovered[i]) * (1 - Math.exp(-dt * 3))
    })
    st.near = Math.hypot(dx, dz) < TEXT_RANGE

    const m = lightsRef.current
    const p = progress.current
    const shown = built.ivory.map((b) => b.mat.opacity > 0.5)
    const key = `${Math.floor(p * list.length * 1.1 - 0.5)}|${shown.map(Number).join('')}|${st.discovered.map((d) => d.toFixed(3)).join(',')}`
    if (m && key !== st.lightKey) {
      st.lightKey = key
      built.lights.forEach((l, i) => {
        tmp.position.set(...l.pos)
        tmp.rotation.set(0, l.yaw ?? 0, l.roll ?? 0)
        const on = l.kind === 'reveal' || l.kind === 'warm' ? p * list.length * 1.1 > l.portal + 0.5 : true
        const found = !l.untilFound || st.discovered[l.portal] > 0.03
        // Floor inlays stay lit even when their station fades for the camera (they lie on the floor).
        if (on && found && (shown[l.portal] || l.pos[1] < 0.02)) tmp.scale.set(...l.size)
        else tmp.scale.setScalar(1e-4)
        tmp.updateMatrix()
        m.setMatrixAt(i, tmp.matrix)
        m.setColorAt(i, lightColour(l, st.discovered[l.portal], col))
      })
      m.instanceMatrix.needsUpdate = true
      if (m.instanceColor) m.instanceColor.needsUpdate = true
    }
    texts.current.forEach((t, i) => {
      if (!t) return
      const o = built.ivory[Math.floor(i / 2)]?.mat.opacity ?? 1
      t.visible = st.near && o > 0.25
      ;(t as unknown as { fillOpacity: number }).fillOpacity = o
    })
  })

  const lift = 0.017 // lettering just proud of the plate
  return (
    <IslandBase island={island}>
      {built.ivory.map((b, i) => (
        <group key={list[i].kind}>
          <mesh name="v2-portal" geometry={b.geo} material={b.mat} />
          <mesh geometry={b.proxy} material={b.mat} visible={false} userData={{ blocksCamera: true, fadeOnBlock: true }} />
        </group>
      ))}
      <mesh name="v2-foundry-machines" geometry={built.charcoal} material={charcoalMat} />
      <mesh name="v2-foundry-floor" geometry={built.inlay} material={inlayMat} />
      {list.map((s, i) => {
        const plate = built.plates[i]
        if (!plate) {
          // The studio's name over its door, on the hall's front.
          const at = stationPoint(s, s.spec.hu + 0.016, -0.45)
          return (
            <group key={s.kind} position={[at.x, 0, at.z]} rotation={[0, -s.facing + Math.PI / 2, 0]}>
              <Text name="v2-engraving" ref={(t) => void (texts.current[i * 2] = t)} font={TITLE_FONT} position={[0, 2.52, 0]} fontSize={0.18} color="#2f2d29" anchorX="center" anchorY="bottom" maxWidth={1.7} textAlign="center">
                {s.chapter.name}
              </Text>
              <Text name="v2-engraving" ref={(t) => void (texts.current[i * 2 + 1] = t)} font={TITLE_FONT} position={[0, 2.49, 0]} fontSize={0.075} lineHeight={1.25} color="#3a3733" anchorX="center" anchorY="top" maxWidth={1.55} textAlign="center">
                {`${s.chapter.role}\n${s.chapter.dates}`}
              </Text>
            </group>
          )
        }
        // The plate's lettering: tilted with the plate, facing up toward the camera.
        const at = stationPoint(s, plate.u, plate.v)
        const n = { y: Math.sin(PLATE.tilt) * lift, z: Math.cos(PLATE.tilt) * lift }
        return (
          <group key={s.kind} position={[at.x, plate.y, at.z]} rotation={[0, -s.facing + Math.PI / 2, 0]}>
            <group position={[0, n.y, n.z]} rotation={[-PLATE.tilt, 0, 0]}>
              <Text name="v2-engraving" ref={(t) => void (texts.current[i * 2] = t)} font={TITLE_FONT} position={[0, 0.025, 0]} fontSize={plateNameSize(s.kind === 'tutor' ? s.chapter.role : s.chapter.name, plate.w)} color="#2f2d29" anchorX="center" anchorY="bottom" maxWidth={plate.w - 0.06} textAlign="center">
                {s.kind === 'tutor' ? s.chapter.role : s.chapter.name}
              </Text>
              <Text name="v2-engraving" ref={(t) => void (texts.current[i * 2 + 1] = t)} font={TITLE_FONT} position={[0, -0.005, 0]} fontSize={0.058} lineHeight={1.2} color="#3a3733" anchorX="center" anchorY="top" maxWidth={plate.w - 0.06} textAlign="center">
                {s.kind === 'tutor' ? `${s.chapter.name}\n${s.chapter.dates}` : `${s.chapter.role}\n${s.chapter.dates}`}
              </Text>
            </group>
          </group>
        )
      })}
      {built.moss && <mesh name="v2-moss" geometry={built.moss} material={mossMat} />}
      <instancedMesh name="v2-portal-lights" ref={lightsRef} args={[lightGeo, lightMat, built.lights.length]} />
      <BlockShadows ref={pads} count={list.length} />
    </IslandBase>
  )
}

/** A plate's name: as large as the plate allows, at most 0.15 m. */
function plateNameSize(name: string, w: number): number {
  return Math.min(0.15, (w - 0.08) / (name.length * 0.58))
}

function lightColour(l: Light, discovered: number, col: Color): Color {
  if (l.kind === 'reveal') return LIT
  if (l.kind === 'warm') return col.copy(DIM).lerp(WARM, l.base)
  return col.copy(DIM).lerp(LIT, l.base + discovered * (1 - l.base))
}
