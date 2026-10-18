import { Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  ExtrudeGeometry,
  Matrix4,
  MeshBasicMaterial,
  Object3D,
  LatheGeometry,
  Path,
  PlaneGeometry,
  Quaternion,
  Shape,
  TorusGeometry,
  Vector2,
  Vector3,
  type InstancedMesh,
  type Mesh,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { cv } from '../../content/cv'
import type { IslandDef } from '../../content/world'
import { artifactInRange } from '../../core/arrival'
import { v } from '../../core/geometry'
import { Artifacts } from '../artifacts/Artifacts'
import { IslandBase } from '../islands/IslandBase'
import { easeOutCubic, useReveal } from '../reveals/useReveal'
import { reducedMotion, sim } from '../sim'
import { TITLE_FONT } from '../space'
import { concreteMaterial, fadingConcreteMaterial, syncFadeTransparency } from './concrete'
import { guideCue } from './cues'
import { honorPlaques } from './projectsAtrium'

// Projects: a sunken atrium beneath a monumental floating ring. Stepped terraces rise around the
// island's rim (so the floor reads as sunk into the stone), opening toward the walkways and toward the
// void behind the central artifact. A concrete ring hovers over it all, tethered by threads of light to
// the three projects. One terrace rises into an honour wall engraved with the hackathon and immersive
// work. Island-local space: +x points outward, angles measured from +x toward +z.

const deg = (d: number) => (d * Math.PI) / 180
const ARCS: [number, number][] = [
  [22, 104], // honour side
  [-104, -22],
  [146, 214], // behind the arrival ring
]
const TIERS: [number, number, number][] = [
  [4.3, 5.95, 0.3],
  [4.8, 5.95, 0.6],
  [5.3, 5.95, 0.9],
]
const WALL = { a0: 50, a1: 96, r0: 5.5, r1: 5.95, h: 2.2 }
const PLAQUE_ANGLES = [59, 73, 87]
const PLAQUE_R = 5.4
// Just above the gameplay camera's view from inside, so it frames the island from afar and its threads
// of light descend into view up close, instead of a slab filling the top of the screen.
const RING = { r0: 3.25, r1: 4.15, h: 0.5, y: 5.7, drop: 2.6 }
const SLOT_R = 3
const SLOT_ANGLES = [-40, 0, 40] // matches the layout's artifact slots
const PLINTH_H = 0.7
const DIM = new Color('#34383d')
const LIT = new Color('#eef6e4')
const TEXT_RANGE = 16

/** Annular sector [a0, a1] (degrees) between radii r0 and r1, extruded up to height h, chamfered. */
function sector(a0: number, a1: number, r0: number, r1: number, h: number): BufferGeometry {
  const s = new Shape()
  const pt = (r: number, a: number) => [r * Math.cos(deg(a)), -r * Math.sin(deg(a))] as const
  s.moveTo(...pt(r0, a0))
  s.lineTo(...pt(r1, a0))
  s.absarc(0, 0, r1, -deg(a0), -deg(a1), true)
  s.lineTo(...pt(r0, a1))
  s.absarc(0, 0, r0, -deg(a1), -deg(a0), false)
  const g = new ExtrudeGeometry(s, { depth: h, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 1, curveSegments: Math.ceil((a1 - a0) / 2) })
  g.rotateX(-Math.PI / 2) // extrude upward; shape y → -z, hence the minus sign in pt()
  g.deleteAttribute('uv')
  return g.toNonIndexed()
}

/**
 * One stepped surface per arc: each riser and tread exactly once, plus end caps. (Stacked solid
 * sectors overlapped and shaded the same pixels up to three times: ~59 ms on the pixel-bound profile.)
 */
function steps(a0: number, a1: number): BufferGeometry[] {
  const seg = Math.ceil((a1 - a0) / 2)
  const phiStart = Math.PI / 2 - deg(a1) // LatheGeometry: x = r·sin(phi), z = r·cos(phi)
  const phiLength = deg(a1 - a0)
  // Profile segments in (r, y), each ordered so the lathe's normal faces the viewer:
  // up = inward along a tread, inward-facing = top→bottom along a riser, outward = bottom→top.
  const faces: [number, number, number, number][] = []
  const rim = TIERS[0][1]
  TIERS.forEach(([r0, , h], i) => {
    const below = i === 0 ? 0 : TIERS[i - 1][2]
    const rEnd = i + 1 < TIERS.length ? TIERS[i + 1][0] : rim
    faces.push([r0, h, r0, below]) // riser, facing the atrium
    faces.push([rEnd, h, r0, h]) // tread, facing up
  })
  faces.push([rim, 0, rim, TIERS[TIERS.length - 1][2]]) // outer face at the rim, facing out
  const out = faces.map(([ra, ya, rb, yb]) => {
    const g = new LatheGeometry([new Vector2(ra, ya), new Vector2(rb, yb)], seg, phiStart, phiLength)
    g.deleteAttribute('uv')
    return g.toNonIndexed()
  })
  // End caps: one quad per step block at each end of the arc, facing away along the arc.
  for (const [r0, r1, h] of TIERS) {
    for (const [a, n] of [
      [a0, -1],
      [a1, 1],
    ] as const) {
      const t = deg(a)
      const nx = n * -Math.sin(t)
      const nz = n * Math.cos(t)
      const rc = (r0 + r1) / 2
      const q = new PlaneGeometry(r1 - r0, h).rotateY(Math.atan2(nx, nz)).translate(rc * Math.cos(t), h / 2, rc * Math.sin(t))
      q.deleteAttribute('uv')
      out.push(q.toNonIndexed())
    }
  }
  return out
}

function terraces(): BufferGeometry {
  const parts: BufferGeometry[] = []
  for (const [a0, a1] of ARCS) parts.push(...steps(a0, a1))
  parts.push(sector(WALL.a0, WALL.a1, WALL.r0, WALL.r1, WALL.h))
  return mergeGeometries(parts, false)!
}

/** Slightly darker inset panels in the honour wall, one per plaque. */
function plaquePanels(): BufferGeometry {
  return mergeGeometries(
    PLAQUE_ANGLES.map((a) => {
      const g = new RoundedBoxGeometry(0.04, 1.15, 1.25, 1, 0.015)
      g.rotateY(-deg(a))
      // Flat panels stand clear of the curved wall face (its chamfer reaches ~3 cm inward).
      g.translate(PLAQUE_R * Math.cos(deg(a)), 1.25, PLAQUE_R * Math.sin(deg(a)))
      g.deleteAttribute('uv')
      return g.toNonIndexed()
    }),
    false,
  )!
}

/** The floating ring: a thick concrete annulus with chamfered edges. */
function ringGeometry(): BufferGeometry {
  const s = new Shape()
  s.absarc(0, 0, RING.r1, 0, Math.PI * 2, false)
  const hole = new Path()
  hole.absarc(0, 0, RING.r0, 0, Math.PI * 2, true)
  s.holes.push(hole)
  const g = new ExtrudeGeometry(s, { depth: RING.h, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 1, curveSegments: 96 })
  g.rotateX(-Math.PI / 2)
  g.translate(0, -RING.h / 2, 0)
  g.deleteAttribute('uv')
  return g
}

/** Low-poly stand-in the camera raycasts against (shares the ring's material, so the fade applies). */
function ringProxy(): BufferGeometry {
  const s = new Shape()
  s.absarc(0, 0, RING.r1, 0, Math.PI * 2, false)
  const hole = new Path()
  hole.absarc(0, 0, RING.r0, 0, Math.PI * 2, true)
  s.holes.push(hole)
  const g = new ExtrudeGeometry(s, { depth: RING.h, bevelEnabled: false, curveSegments: 16 })
  g.rotateX(-Math.PI / 2)
  g.translate(0, RING.y - RING.h / 2, 0)
  return g
}

/**
 * The atrium floor: a soft radial wash darkening the sunken floor, deepening at the foot of the
 * terraces (fake ambient occlusion) and fading out at the rim. Vertex alpha, one transparent draw.
 */
function floorWash(): BufferGeometry {
  const radii = [0, 3.9, 4.15, 4.3, 4.6]
  const alpha = [0.1, 0.1, 0.26, 0.3, 0]
  const seg = 72
  const pos: number[] = []
  const col: number[] = []
  const ring = (k: number, i: number) => [radii[k] * Math.cos((i / seg) * Math.PI * 2), 0.008, radii[k] * Math.sin((i / seg) * Math.PI * 2)]
  for (let k = 0; k < radii.length - 1; k++) {
    for (let i = 0; i < seg; i++) {
      const a = ring(k, i)
      const b = ring(k, i + 1)
      const c = ring(k + 1, i)
      const d = ring(k + 1, i + 1)
      pos.push(...a, ...c, ...b, ...b, ...c, ...d)
      col.push(0, 0, 0, alpha[k], 0, 0, 0, alpha[k + 1], 0, 0, 0, alpha[k], 0, 0, 0, alpha[k], 0, 0, 0, alpha[k + 1], 0, 0, 0, alpha[k + 1])
    }
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3))
  g.setAttribute('color', new BufferAttribute(new Float32Array(col), 4))
  return g
}

type Light = { matrix: Matrix4; slot: number; base: number; beam?: boolean }

const tmpO = new Object3D()
function boxAt(x: number, y: number, z: number, sx: number, sy: number, sz: number, yaw = 0): Matrix4 {
  tmpO.position.set(x, y, z)
  tmpO.rotation.set(0, yaw, 0)
  tmpO.scale.set(sx, sy, sz)
  tmpO.updateMatrix()
  return tmpO.matrix.clone()
}
function beam(from: Vector3, to: Vector3, w: number): Matrix4 {
  const dir = to.clone().sub(from)
  const q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir.clone().normalize())
  return new Matrix4().compose(from.clone().add(to).multiplyScalar(0.5), q, new Vector3(w, dir.length(), w))
}

/**
 * Plinths in the atrium's language, one per project and shaped by its kind (from the CV's
 * `appearance`): a round meditation plinth ringed with light (XR), a lattice-faced block (AI avatars),
 * and a stepped "pixel" stack with four tiles for the four released mobile games.
 */
function plinthsAndLights(): { plinths: BufferGeometry; lights: Light[] } {
  const parts: BufferGeometry[] = []
  const lights: Light[] = []
  cv.projects.projects.forEach((p, i) => {
    const o = deg(SLOT_ANGLES[i])
    const cx = SLOT_R * Math.cos(o)
    const cz = SLOT_R * Math.sin(o)
    const face = o + Math.PI // toward the atrium's centre
    const fx = Math.cos(face)
    const fz = Math.sin(face)
    const yaw = -face // rotates local +x onto the centre-facing direction
    const add = (g: BufferGeometry) => parts.push(g.translate(cx, 0, cz).toNonIndexed())
    if (p.appearance === 'featured') {
      add(new CylinderGeometry(0.55, 0.62, PLINTH_H, 48).translate(0, PLINTH_H / 2, 0))
      for (let k = 0; k < 24; k++) {
        const a = (k / 24) * Math.PI * 2
        lights.push({ matrix: boxAt(cx + Math.cos(a) * 0.565, PLINTH_H - 0.12, cz + Math.sin(a) * 0.565, 0.045, 0.045, 0.045), slot: i, base: 0.15 })
      }
    } else if (p.appearance === 'technical') {
      const g = new RoundedBoxGeometry(0.95, PLINTH_H, 0.95, 1, 0.04).translate(0, PLINTH_H / 2, 0)
      g.rotateY(yaw)
      add(g)
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 5; c++) {
          const side = (c - 2) * 0.16
          lights.push({ matrix: boxAt(cx + fx * 0.48 - fz * side, 0.2 + r * 0.15, cz + fz * 0.48 + fx * side, 0.03, 0.035, 0.035, yaw), slot: i, base: 0.15 })
        }
      }
    } else {
      for (const [w, y0, h] of [
        [1.0, 0, 0.3],
        [0.8, 0.3, 0.25],
        [0.6, 0.55, 0.15],
      ] as const) {
        const g = new RoundedBoxGeometry(w, h, w, 1, 0.03).translate(0, y0 + h / 2, 0)
        g.rotateY(yaw)
        add(g)
      }
      for (let k = 0; k < 4; k++) {
        const side = (k - 1.5) * 0.2
        lights.push({ matrix: boxAt(cx + fx * 0.505 - fz * side, 0.15, cz + fz * 0.505 + fx * side, 0.02, 0.12, 0.12, yaw), slot: i, base: 0.15 })
      }
    }
    // A thread of light from the ring down to the project, lit once the project is discovered.
    const top = new Vector3(Math.cos(o) * (RING.r0 + 0.25), RING.y - RING.h / 2 - 0.02, Math.sin(o) * (RING.r0 + 0.25))
    lights.push({ matrix: beam(top, new Vector3(cx, 3.0, cz), 0.025), slot: i, base: 0.25, beam: true })
  })
  return { plinths: mergeGeometries(parts.map((g) => (g.getAttribute('uv') ? (g.deleteAttribute('uv'), g) : g)), false)!, lights }
}

export function ProjectsV2({ island }: { island: IslandDef }) {
  const progress = useReveal(island.id)
  const plaques = useMemo(() => honorPlaques(cv.projects.honors), [])
  const geo = useMemo(() => ({ terraces: terraces(), panels: plaquePanels(), ring: ringGeometry(), proxy: ringProxy(), wash: floorWash(), ...plinthsAndLights() }), [])
  const ringMat = useMemo(() => fadingConcreteMaterial('#e9e5dc'), [])
  const washMat = useMemo(() => new MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, fog: false, polygonOffset: true, polygonOffsetFactor: -2 }), [])
  const glowMat = useMemo(() => new MeshBasicMaterial({ color: '#dfe9d4', toneMapped: false }), [])
  const lightGeo = useMemo(() => new BoxGeometry(1, 1, 1), [])
  const lightMat = useMemo(() => new MeshBasicMaterial({ color: '#ffffff', toneMapped: false }), [])
  const underGlow = useMemo(() => new TorusGeometry(RING.r0 + 0.12, 0.018, 6, 96).rotateX(Math.PI / 2), [])
  const ring = useRef<Mesh>(null)
  const glow = useRef<Mesh>(null)
  const lightsRef = useRef<InstancedMesh>(null)
  const texts = useRef<(Object3D | null)[]>([])
  const col = useMemo(() => new Color(), [])
  const hidden = useMemo(() => new Matrix4().makeScale(1e-4, 1e-4, 1e-4), [])
  const state = useRef({ discovered: [0, 0, 0], found: [false, false, false], key: '' })

  // Per-instance colours exist before the precompile runs (creating them later switches the shader variant).
  useLayoutEffect(() => {
    const m = lightsRef.current
    if (!m) return
    geo.lights.forEach((l, i) => {
      m.setMatrixAt(i, l.matrix)
      m.setColorAt(i, col.copy(DIM).lerp(LIT, l.base))
    })
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [geo, col])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1)
    const st = state.current
    syncFadeTransparency([ringMat])
    // First visit: the ring descends into place. Threads of light appear once it has settled.
    const p = progress.current
    const settle = reducedMotion() ? (p > 0 ? 1 : 0) : easeOutCubic(p * 1.25)
    if (ring.current) ring.current.position.y = RING.y + (1 - settle) * RING.drop
    if (glow.current) {
      glow.current.position.y = RING.y - RING.h / 2 - 0.01 + (1 - settle) * RING.drop
      glow.current.visible = ringMat.opacity > 0.5
    }
    // Discovery: the first time per visit the player comes within an artifact's interaction range.
    // Same range test as the interact prompt, so "discovered" means "you could open it now".
    const near = artifactInRange(sim.player.pos, island.artifactSlots)
    if (near !== null && !st.found[near]) {
      st.found[near] = true
      guideCue.seq++
    }
    st.discovered.forEach((d, i) => (st.discovered[i] = d + ((st.found[i] ? 1 : 0) - d) * (1 - Math.exp(-dt * 3))))
    const m = lightsRef.current
    const showBeams = settle > 0.98 && ringMat.opacity > 0.5
    const key = `${showBeams ? 1 : 0}|${st.discovered.map((d) => d.toFixed(3)).join(',')}`
    if (m && key !== st.key) {
      st.key = key
      geo.lights.forEach((l, i) => {
        m.setMatrixAt(i, l.beam && !showBeams ? hidden : l.matrix)
        m.setColorAt(i, col.copy(DIM).lerp(LIT, l.base + st.discovered[l.slot] * (1 - l.base)))
      })
      m.instanceMatrix.needsUpdate = true
      if (m.instanceColor) m.instanceColor.needsUpdate = true
    }
    // Engravings render only near the island.
    const close = v.dist(sim.player.pos, island.centre) < TEXT_RANGE
    for (const t of texts.current) if (t) t.visible = close
  })

  return (
    <IslandBase island={island}>
      {/* Drawn before the island slab, so the slab pixels it covers are rejected by depth instead of shaded twice. */}
      <mesh name="v2-terraces" geometry={geo.terraces} material={concreteMaterial('#e6e2d9')} renderOrder={-1} />
      <mesh name="v2-plaques" geometry={geo.panels} material={concreteMaterial('#d3cec3')} />
      <mesh name="v2-plinths" geometry={geo.plinths} material={concreteMaterial('#ebe7df')} />
      <mesh name="v2-atrium-wash" geometry={geo.wash} material={washMat} renderOrder={1} />
      <mesh name="v2-ring" ref={ring} geometry={geo.ring} material={ringMat} position={[0, RING.y, 0]} />
      <mesh geometry={geo.proxy} material={ringMat} visible={false} userData={{ blocksCamera: true, fadeOnBlock: true }} />
      <mesh ref={glow} geometry={underGlow} material={glowMat} position={[0, RING.y - RING.h / 2 - 0.01, 0]} />
      <instancedMesh name="v2-atrium-lights" ref={lightsRef} args={[lightGeo, lightMat, geo.lights.length]} />
      {plaques.map((pl, i) => {
        const a = deg(PLAQUE_ANGLES[i])
        const r = PLAQUE_R - 0.03
        // Face the atrium's centre: rotate the text's +z onto the inward direction.
        const yaw = Math.atan2(-Math.cos(a), -Math.sin(a))
        return (
          <group key={pl.title} position={[r * Math.cos(a), 1.25, r * Math.sin(a)]} rotation={[0, yaw, 0]}>
            <Text name="v2-engraving" ref={(t) => void (texts.current[i * 2] = t)} font={TITLE_FONT} position={[0, 0.2, 0]} fontSize={0.17} color="#4f4c46" anchorX="center" anchorY="bottom" maxWidth={1.1} textAlign="center">
              {pl.title}
            </Text>
            <Text
              name="v2-engraving"
              ref={(t) => void (texts.current[i * 2 + 1] = t)}
              font={TITLE_FONT}
              position={[0, 0.14, 0]}
              fontSize={0.075}
              lineHeight={1.3}
              color="#625e57"
              anchorX="center"
              anchorY="top"
              textAlign="center"
              maxWidth={1.05}
            >
              {`${pl.award}\n${pl.event}`}
            </Text>
          </group>
        )
      })}
    </IslandBase>
  )
}

/** Artifacts live in world space at the layout's slots, so they are mounted beside the island group. */
export function ProjectsIslandV2({ island }: { island: IslandDef }) {
  return (
    <>
      <ProjectsV2 island={island} />
      <Artifacts island={island} />
    </>
  )
}
