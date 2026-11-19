import { Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { BoxGeometry, Color, ExtrudeGeometry, IcosahedronGeometry, Matrix4, MeshBasicMaterial, MeshLambertMaterial, Object3D, Path, Shape, Vector3, type BufferGeometry, type InstancedMesh } from 'three'
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
import { fadingConcreteMaterial, syncFadeTransparency } from './concrete'
import { guideCue } from './cues'
import { experienceChapters } from './experienceChapters'
import { arcPoint, NICHE, pierAngles, threshold, WALL, wallBays, type Bay } from './experienceLayout'

// Experience: one long concrete wall between the arrival ring and the void, curved around the ring and
// pierced by one opening per career chapter, oldest on the left. Each opening has its own outline
// (Medrick's pixel steps, Ubicomp's lab lattice, OASIS's moon, ARVO's shifted overlay, Sämmi's sauna
// gable); the minor tutoring chapter is a lit niche. Walking through an opening discovers that chapter.
//
// Bay-local space: x runs along the wall (+x is the arrival's right), y up, z out of the front face
// toward the arrival; the back face is at z = 0, the front at z = T.

const DIM = new Color('#34383d')
const LIT = new Color('#eef6e4')
const WARM = new Color('#ffd9a0') // Sämmi's threshold: the same löyly light as the SanaSauna exhibit
const TEXT_RANGE = 18 // engravings render only when the player is near (they're unreadable from afar)
const { T, H } = WALL
const NICHE_Y = 0.6
/** The moon gate's circle (OASIS). */
const MOON = { r: 1.2, cy: 1.25 }

/** Light elements are unit boxes in one instanced draw: lit by the reveal, by discovery, or warm. */
export type Light = { pos: [number, number, number]; size: [number, number, number]; portal: number; kind: 'reveal' | 'discover' | 'warm'; base: number; yaw?: number; roll?: number }

/** The wall's local frame for a bay at `angle`: back face on the arc at R + T, front toward the arrival. */
export function bayYaw(angle: number): number {
  return -(angle + Math.PI / 2)
}
function bayMatrix(angle: number): Matrix4 {
  const p = arcPoint(angle, WALL.R + T)
  return new Matrix4().makeRotationY(bayYaw(angle)).setPosition(p.x, 0, p.z)
}

/** The opening's outline, from the bottom-left corner over the top to the bottom-right (bay-local x, y). */
function openingPath(kind: Bay['kind'], gap: number): [number, number][] {
  const a = gap
  switch (kind) {
    case 'medrick': {
      // A phone-shaped opening whose top corners step in like pixels.
      const h = 2.45
      const s = 0.13
      return [[-a, 0], [-a, h - 3 * s], [-a + s, h - 3 * s], [-a + s, h - 2 * s], [-a + 2 * s, h - 2 * s], [-a + 2 * s, h - s], [-a + 3 * s, h - s], [-a + 3 * s, h], [a - 3 * s, h], [a - 3 * s, h - s], [a - 2 * s, h - s], [a - 2 * s, h - 2 * s], [a - s, h - 2 * s], [a - s, h - 3 * s], [a, h - 3 * s], [a, 0]]
    }
    case 'oasis': {
      // The moon gate: a circle reaching down to the floor, its foot opened to the walking width.
      // Straight sides up to where the circle is as wide as the walking gap, then the circle over the top.
      const { r, cy } = MOON
      const k = Math.sqrt(r * r - a * a)
      const tL = Math.PI + Math.atan2(k, a)
      const tR = -Math.atan2(k, a)
      const out: [number, number][] = [[-a, 0]]
      const n = 48
      for (let i = 0; i <= n; i++) {
        const t = tL - (i / n) * (tL - tR)
        out.push([r * Math.cos(t), cy + r * Math.sin(t)])
      }
      out.push([a, 0])
      return out
    }
    case 'arvo': {
      // A clean rounded opening; its augmented twin is a line of light, shifted (see the lights).
      const h = 2.5
      const r = 0.3
      const out: [number, number][] = [[-a, 0], [-a, h - r]]
      for (let i = 1; i < 8; i++) out.push([-a + r - r * Math.cos((i / 8) * (Math.PI / 2)), h - r + r * Math.sin((i / 8) * (Math.PI / 2))])
      out.push([-a + r, h], [a - r, h])
      for (let i = 1; i < 8; i++) out.push([a - r + r * Math.sin((i / 8) * (Math.PI / 2)), h - r + r * Math.cos((i / 8) * (Math.PI / 2))])
      out.push([a, h - r], [a, 0])
      return out
    }
    case 'sammi':
      // A sauna's gable: the house every child draws, and the newest door.
      return [[-a, 0], [-a, 1.9], [0, 2.6], [a, 1.9], [a, 0]]
    case 'ubicomp':
      return [[-a, 0], [-a, 2.5], [a, 2.5], [a, 0]]
    default:
      return [[-a, 0], [-a, 2.4], [a, 2.4], [a, 0]]
  }
}

function extrude(shape: Shape, z0: number, depth: number): BufferGeometry {
  const g = new ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 1, curveSegments: 24 })
  g.deleteAttribute('uv')
  return g.translate(0, 0, z0 + 0.02).toNonIndexed()
}

const rect = (target: Shape | Path, x0: number, y0: number, x1: number, y1: number) => target.moveTo(x0, y0).lineTo(x1, y0).lineTo(x1, y1).lineTo(x0, y1).lineTo(x0, y0)

/** One bay's concrete in bay-local space: a panel around its opening, or a solid panel with a niche. */
function bayGeometry(bay: Bay): BufferGeometry[] {
  const hw = bay.w / 2
  if (!bay.opening) {
    const back = new Shape()
    rect(back, -hw, 0, hw, H)
    const front = new Shape()
    rect(front, -hw, 0, hw, H)
    const hole = new Path()
    rect(hole, -NICHE.w / 2, NICHE_Y, NICHE.w / 2, NICHE_Y + NICHE.h)
    front.holes.push(hole)
    return [extrude(back, 0, T - NICHE.depth - 0.04), extrude(front, T - NICHE.depth, NICHE.depth - 0.04)]
  }
  // A U-shaped outline around the opening (it meets the floor, so it can't be a hole).
  const s = new Shape()
  s.moveTo(-hw, 0)
  for (const [x, y] of openingPath(bay.kind, bay.gap)) s.lineTo(x, y)
  s.lineTo(hw, 0).lineTo(hw, H).lineTo(-hw, H).lineTo(-hw, 0)
  return [extrude(s, 0, T - 0.04)]
}

/** The bay's light elements, in bay-local space (converted to island space by the caller). */
function bayLights(bay: Bay, i: number): Light[] {
  const out: Light[] = []
  const at = (x: number, y: number, z: number, sx: number, sy: number, sz: number, kind: Light['kind'], base: number, roll = 0) =>
    out.push({ pos: [x, y, z], size: [sx, sy, sz], portal: i, kind, base, roll })
  const face = T + 0.012
  // Between each name and its role, a hairline that lights as the island is revealed.
  at(0, 2.955, face, Math.min(1.0, bay.w - 0.5), 0.018, 0.01, 'reveal', 1)
  if (bay.opening) at(0, 0.012, T / 2, bay.gap * 2 - 0.2, 0.02, 0.12, bay.kind === 'sammi' ? 'warm' : 'discover', bay.kind === 'sammi' ? 0.7 : 0.12)
  switch (bay.kind) {
    case 'medrick':
      // Four inset tiles beside the opening, one per released title.
      for (let k = 0; k < 4; k++) at(-bay.gap - 0.13, 0.8 + k * 0.38, face, 0.12, 0.12, 0.01, 'discover', 0.12)
      break
    case 'ubicomp':
      // The lab lattice: three fine grooves of light on either side.
      for (const side of [-1, 1]) for (let k = 0; k < 3; k++) at(side * (bay.gap + 0.07 + k * 0.07), 1.3, face, 0.016, 2.2, 0.01, 'discover', 0.12)
      break
    case 'oasis': {
      const r = MOON.r + 0.14
      for (let k = 0; k < 26; k++) {
        const t = (k / 26) * Math.PI * 2
        const y = MOON.cy + r * Math.sin(t)
        if (y > 0.18) at(r * Math.cos(t), y, face, 0.045, 0.045, 0.01, 'discover', 0.12)
      }
      break
    }
    case 'arvo': {
      // The augmented twin: the opening's outline in light, shifted up and to the right.
      const d = 0.1
      const a = bay.gap
      const side = 2.5 - 0.3
      at(-a + d, d + side / 2, face, 0.025, side, 0.01, 'discover', 0.4)
      at(a + d, d + side / 2, face, 0.025, side, 0.01, 'discover', 0.4)
      at(d, 2.5 + d, face, 2 * (a - 0.3), 0.025, 0.01, 'discover', 0.4)
      break
    }
    case 'sammi': {
      // Warm light along the gable's edges, just inside the opening.
      const a = bay.gap - 0.05
      const len = Math.hypot(a, 0.7)
      const roll = Math.atan2(0.7, a)
      at(-a / 2, 1.9 + 0.35 - 0.04, face, len, 0.03, 0.01, 'warm', 0.85, roll)
      at(a / 2, 1.9 + 0.35 - 0.04, face, len, 0.03, 0.01, 'warm', 0.85, -roll)
      break
    }
    case 'niche':
      // A soft light at the top of the niche, over its lettering.
      at(0, NICHE_Y + NICHE.h - 0.06, T - NICHE.depth + 0.02, NICHE.w - 0.12, 0.025, 0.02, 'discover', 0.45)
      break
  }
  return out
}

/** A few soft moss cushions at the moon gate's foot, on the arrival side. */
function mossGeometry(bay: Bay): BufferGeometry {
  const parts = [
    [-0.95, 0.35, 0.16],
    [-1.12, 0.55, 0.11],
    [-0.8, 0.62, 0.09],
    [0.98, 0.42, 0.07],
  ].map(([x, dz, r]) => new IcosahedronGeometry(r, 1).scale(1, 0.55, 1).translate(x, r * 0.25, T + dz).toNonIndexed())
  return mergeGeometries(parts, false)!.applyMatrix4(bayMatrix(bay.angle))
}

/**
 * Engraving size: as large as the bay allows, never above 0.26 m. A minor chapter's niche is titled by
 * its role ("Tutor"), its organisation going on the line below with the dates.
 */
function nameSize(bay: Bay): number {
  const title = bay.opening ? bay.chapter.name : bay.chapter.role
  return Math.min(bay.opening ? 0.26 : 0.2, (bay.w - 0.3) / (title.length * 0.58))
}

export function ExperienceV2({ island }: { island: IslandDef }) {
  const progress = useReveal(island.id)
  const bays = useMemo(() => wallBays(experienceChapters(cv.experience.entries)), [])
  const built = useMemo(() => {
    const concrete: BufferGeometry[] = []
    const proxy: BufferGeometry[] = []
    const lights: Light[] = []
    bays.forEach((bay, i) => {
      const m = bayMatrix(bay.angle)
      for (const g of bayGeometry(bay)) concrete.push(g.applyMatrix4(m))
      const box = new BoxGeometry(bay.w, H, T).translate(0, H / 2, T / 2)
      box.deleteAttribute('uv')
      proxy.push(box.toNonIndexed().applyMatrix4(m))
      for (const l of bayLights(bay, i)) {
        const p = new Vector3(...l.pos).applyMatrix4(m)
        lights.push({ ...l, pos: [p.x, p.y, p.z], yaw: bayYaw(bay.angle) })
      }
    })
    // Piers between the bays, a little taller than the wall: the rhythm of the façade.
    for (const a of pierAngles(bays)) {
      const g = new RoundedBoxGeometry(WALL.pier.w, WALL.pier.h, T + 0.14, 1, 0.04).translate(0, WALL.pier.h / 2, T / 2)
      g.deleteAttribute('uv')
      concrete.push(g.toNonIndexed().applyMatrix4(bayMatrix(a)))
    }
    const oasis = bays.find((b) => b.kind === 'oasis')
    return {
      wall: mergeGeometries(concrete, false)!,
      proxy: mergeGeometries(proxy, false)!,
      lights,
      moss: oasis ? mossGeometry(oasis) : null,
      thresholds: bays.map((b) => (b.opening ? threshold(b) : null)),
      mat: fadingConcreteMaterial('#ebe7df'),
    }
  }, [bays])
  const mossMat = useMemo(() => new MeshLambertMaterial({ color: '#5f9a34', emissive: new Color('#1e3d0d'), emissiveIntensity: 0.5 }), [])
  const lightGeo = useMemo(() => new BoxGeometry(1, 1, 1), [])
  const lightMat = useMemo(() => new MeshBasicMaterial({ color: '#ffffff', toneMapped: false }), [])
  const lightsRef = useRef<InstancedMesh>(null)
  const pads = useRef<InstancedMesh>(null)
  const texts = useRef<(Object3D | null)[]>([])
  const state = useRef({ discovered: bays.map(() => 0), passed: bays.map(() => false), last: bays.map(() => null as number | null), near: false, lightKey: '' })
  const tmp = useMemo(() => new Object3D(), [])
  const col = useMemo(() => new Color(), [])
  const outward = v.angleOf(island.centre)

  // Give the lights their per-instance colours at mount, before the precompile runs: creating the
  // colour buffer later switches the shader variant and compiled it when the island first came into view.
  useLayoutEffect(() => {
    const m = lightsRef.current
    if (!m) return
    built.lights.forEach((l, i) => m.setColorAt(i, lightColour(l, 0, col)))
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [built, col])

  useLayoutEffect(() => {
    const p = pads.current
    if (!p) return
    bays.forEach((bay, i) => {
      const c = arcPoint(bay.angle, WALL.R + T / 2)
      tmp.position.set(c.x, 0.012, c.z)
      tmp.rotation.set(0, bayYaw(bay.angle), 0)
      tmp.scale.set(bay.w + SHADOW_SPREAD * 2, 1, T + SHADOW_SPREAD * 2)
      tmp.updateMatrix()
      p.setMatrixAt(i, tmp.matrix)
    })
    p.instanceMatrix.needsUpdate = true
  }, [bays, tmp])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1)
    const st = state.current
    syncFadeTransparency([built.mat])
    // The player in island-local space (+x outward, z across).
    const dx = sim.player.pos.x - island.centre.x
    const dz = sim.player.pos.z - island.centre.z
    const lx = dx * Math.cos(outward) + dz * Math.sin(outward)
    const lz = -dx * Math.sin(outward) + dz * Math.cos(outward)
    // Walking through an opening for the first time per visit discovers that chapter.
    bays.forEach((_, i) => {
      const t = built.thresholds[i]
      if (t) {
        const rx = lx - t.o.x
        const rz = lz - t.o.z
        const along = rx * Math.cos(t.yaw) + rz * Math.sin(t.yaw)
        const across = -rx * Math.sin(t.yaw) + rz * Math.cos(t.yaw)
        const last = st.last[i]
        if (!st.passed[i] && last !== null && Math.abs(across) < t.half && Math.sign(last) !== Math.sign(along) && Math.abs(along - last) < 1) {
          st.passed[i] = true
          guideCue.seq++
        }
        st.last[i] = along
      }
      st.discovered[i] += ((st.passed[i] ? 1 : 0) - st.discovered[i]) * (1 - Math.exp(-dt * 3))
    })
    st.near = Math.hypot(dx, dz) < TEXT_RANGE

    const m = lightsRef.current
    const p = progress.current
    const shown = built.mat.opacity > 0.5 // lights vanish with the wall when it fades for the camera
    // Rewrite and re-upload the light instances only when something visible changed.
    const key = `${Math.floor(p * bays.length * 1.1 - 0.5)}|${shown ? 1 : 0}|${st.discovered.map((d) => d.toFixed(3)).join(',')}`
    if (m && key !== st.lightKey) {
      st.lightKey = key
      built.lights.forEach((l, i) => {
        tmp.position.set(...l.pos)
        tmp.rotation.set(0, l.yaw ?? 0, l.roll ?? 0)
        // Reveal (and warm) lights ignite bay after bay; discovery lights brighten when you pass.
        const on = l.kind === 'reveal' || l.kind === 'warm' ? p * bays.length * 1.1 > l.portal + 0.5 : true
        // Collapse on every axis when hidden (a box flattened in one axis still shows a face).
        if (on && shown) tmp.scale.set(...l.size)
        else tmp.scale.setScalar(1e-4)
        tmp.updateMatrix()
        m.setMatrixAt(i, tmp.matrix)
        m.setColorAt(i, lightColour(l, st.discovered[l.portal], col))
      })
      m.instanceMatrix.needsUpdate = true
      if (m.instanceColor) m.instanceColor.needsUpdate = true
    }
    // Engravings fade with the wall when it turns translucent for the camera.
    const o = built.mat.opacity
    for (const t of texts.current) {
      if (!t) continue
      t.visible = st.near && o > 0.25 // no ghost lettering over a faded wall
      ;(t as unknown as { fillOpacity: number }).fillOpacity = o
    }
  })

  return (
    <IslandBase island={island}>
      <mesh name="v2-portal" geometry={built.wall} material={built.mat} />
      {/* Invisible stand-in, solid across every opening, so the wall fades whenever it hides the player. */}
      <mesh geometry={built.proxy} material={built.mat} visible={false} userData={{ blocksCamera: true, fadeOnBlock: true }} />
      {bays.map((bay, i) => {
        const p = arcPoint(bay.angle, WALL.R + T)
        return (
          <group key={`${bay.chapter.name}-${bay.chapter.dates}`} position={[p.x, 0, p.z]} rotation={[0, bayYaw(bay.angle), 0]}>
            {/* Career information is engraved above each opening (above the niche for a minor chapter). */}
            <Text
              name="v2-engraving"
              ref={(t) => void (texts.current[i * 2] = t)}
              font={TITLE_FONT}
              position={[0, 2.98, T + 0.012]}
              fontSize={nameSize(bay)}
              color="#2f2d29"
              anchorX="center"
              anchorY="bottom"
              maxWidth={bay.w - 0.2}
              textAlign="center"
            >
              {bay.opening ? bay.chapter.name : bay.chapter.role}
            </Text>
            <Text
              name="v2-engraving"
              ref={(t) => void (texts.current[i * 2 + 1] = t)}
              font={TITLE_FONT}
              position={[0, 2.925, T + 0.012]}
              fontSize={0.085}
              lineHeight={1.25}
              color="#3a3733"
              anchorX="center"
              anchorY="top"
              textAlign="center"
              maxWidth={bay.w - 0.2}
            >
              {bay.opening ? `${bay.chapter.role}\n${bay.chapter.dates}` : `${bay.chapter.name}\n${bay.chapter.dates}`}
            </Text>
          </group>
        )
      })}
      {built.moss && <mesh name="v2-moss" geometry={built.moss} material={mossMat} />}
      <instancedMesh name="v2-portal-lights" ref={lightsRef} args={[lightGeo, lightMat, built.lights.length]} />
      <BlockShadows ref={pads} count={bays.length} />
    </IslandBase>
  )
}

function lightColour(l: Light, discovered: number, col: Color): Color {
  if (l.kind === 'reveal') return LIT
  if (l.kind === 'warm') return col.copy(DIM).lerp(WARM, l.base)
  return col.copy(DIM).lerp(LIT, l.base + discovered * (1 - l.base))
}
