import { Text } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { BoxGeometry, Color, Matrix4, MeshBasicMaterial, Object3D, type BufferGeometry, type InstancedMesh, type MeshLambertMaterial } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { cv } from '../../content/cv'
import type { IslandDef } from '../../content/world'
import { v } from '../../core/geometry'
import { IslandBase } from '../islands/IslandBase'
import { useReveal, easeOutCubic } from '../reveals/useReveal'
import { reducedMotion, sim } from '../sim'
import { TITLE_FONT } from '../space'
import { BlockShadows } from './BlockShadows'
import { fadingConcreteMaterial, syncFadeTransparency } from './concrete'
import { guideCue } from './cues'
import { skillDistricts, type District, type DistrictStyle } from './skillDistricts'

// Skills: the Data City. A miniature brutalist skyline around an open plaza, one district per CV skill
// group and one building per skill, each labelled on its plaza-facing side with the skill's exact
// words. The three main areas form the skyline (XR at its peak, behind the plaza, toward the void);
// programming and languages are low supporting districts near the entrance. Floor lines lead from the
// plaza to each district's name stone. Height shapes the skyline; it never rates a skill.
// Island-local space: +x points outward; angles are measured from +x toward +z.

const deg = (d: number) => (d * Math.PI) / 180
type Place = { centre: number; span: number; r: number }
const PLACES: Record<DistrictStyle, Place> = {
  game: { centre: -62, span: 68, r: 4.75 },
  xr: { centre: 0, span: 44, r: 4.95 },
  ai: { centre: 62, span: 68, r: 4.75 },
  tools: { centre: 160, span: 24, r: 4.6 },
  languages: { centre: 200, span: 34, r: 4.7 },
}
type Size = { w: number; d: number; base: number; peak: number }
const SIZES: Record<DistrictStyle, Size> = {
  game: { w: 0.66, d: 0.7, base: 1.5, peak: 1.3 },
  xr: { w: 0.52, d: 0.55, base: 2.4, peak: 1.7 },
  ai: { w: 0.62, d: 0.66, base: 2.0, peak: 1.4 },
  tools: { w: 0.95, d: 0.6, base: 0.75, peak: 0 },
  languages: { w: 0.5, d: 0.16, base: 1.35, peak: 0 },
}
// Tighter grounding pads than elsewhere: 22 overlapping full-size pads cost ~6.6 ms of overdraw.
const PAD_SPREAD = 0.28
const SIGN_R = 2.55 // name stones stand on this circle, at the plaza's edge
const STAGGER = 0.38 // alternate buildings step back, so each district layers into a skyline
const PLATE = { w: 0.92, h: 0.56, tilt: deg(50), gap: 0.42 } // slanted label plate in front of each building
const FIND_RANGE = 2.4
const TEXT_RANGE = 16
const DIM = new Color('#34383d')
const LIT = new Color('#eef6e4')

type Building = { x: number; z: number; yaw: number; theta: number; w: number; d: number; h: number; label: string }
type Light = { matrix: Matrix4; district: number; base: number }
type Built = { geo: BufferGeometry; proxy: BufferGeometry; buildings: Building[]; sign: { x: number; z: number; theta: number } }

const tmp = new Object3D()
/** A light box in a building's frame: placed at (cx, y, cz), turned by yaw, offset (ox, oz), sized (sx, sy, sz). */
function lightBox(cx: number, cz: number, yaw: number, ox: number, y: number, oz: number, sx: number, sy: number, sz: number): Matrix4 {
  return new Matrix4()
    .makeTranslation(cx, y, cz)
    .multiply(new Matrix4().makeRotationY(yaw))
    .multiply(new Matrix4().makeTranslation(ox, 0, oz))
    .multiply(new Matrix4().makeScale(sx, sy, sz))
}

/** A chamfered block in a building's own frame (+x faces the plaza), placed and turned into island space. */
function block(b: { x: number; z: number; yaw: number }, w: number, h: number, d: number, y0: number, ox = 0, oz = 0, r = 0.035): BufferGeometry {
  const g = new RoundedBoxGeometry(d, h, w, 1, Math.min(r, d / 2.2, h / 2.2, w / 2.2))
  g.translate(ox, y0 + h / 2, oz)
  g.rotateY(b.yaw)
  g.translate(b.x, 0, b.z)
  g.deleteAttribute('uv')
  return g.toNonIndexed()
}

/** One district: its buildings (styled by kind), its name stone, and its lights (windows, frames, floor line). */
function buildDistrict(dist: District, index: number, lights: Light[]): Built {
  const place = PLACES[dist.style]
  const size = SIZES[dist.style]
  const n = dist.items.length
  const parts: BufferGeometry[] = []
  const proxies: BufferGeometry[] = []
  const buildings: Building[] = dist.items.map((label, k) => {
    const theta = deg(place.centre - place.span / 2 + (place.span * (k + 0.5)) / n)
    const off = n > 1 ? ((k + 0.5) / n) * 2 - 1 : 0
    // The skyline rises toward each district's middle; a small alternating step keeps it lively.
    const h = size.base + size.peak * (1 - Math.abs(off) ** 1.5) + (size.peak > 0 ? (k % 2 ? -0.18 : 0.18) : 0)
    const r = place.r + (size.peak > 0 && k % 2 ? STAGGER : 0)
    return { x: r * Math.cos(theta), z: r * Math.sin(theta), yaw: -(theta + Math.PI), theta, w: size.w, d: size.d, h, label }
  })
  buildings.forEach((b, k) => {
    const window = (ox: number, y: number, oz: number, base: number) => lights.push({ matrix: lightBox(b.x, b.z, b.yaw, ox, y, oz, 0.02, 0.17, 0.11), district: index, base })
    if (dist.style === 'game') {
      // Game development: stacked, offset "pixel" blocks.
      const h1 = b.h * 0.55
      parts.push(block(b, b.w, h1, b.d, 0))
      parts.push(block(b, b.w * 0.78, b.h * 0.3, b.d * 0.78, h1, -0.06, k % 2 ? 0.07 : -0.07))
      parts.push(block(b, b.w * 0.5, b.h * 0.15, b.d * 0.5, h1 + b.h * 0.3, 0.04, k % 2 ? -0.05 : 0.05))
    } else if (dist.style === 'xr') {
      // XR: slender towers, each wearing a floating frame of light near its top.
      parts.push(block(b, b.w, b.h, b.d, 0))
      const fy = b.h * 0.78
      const half = b.w / 2 + 0.1
      const hd = b.d / 2 + 0.1
      for (const [ox, oz, sx, sz] of [
        [hd, 0, 0.035, half * 2],
        [-hd, 0, 0.035, half * 2],
        [0, half, hd * 2, 0.035],
        [0, -half, hd * 2, 0.035],
      ])
        lights.push({ matrix: lightBox(b.x, b.z, b.yaw, ox, fy, oz, sx, 0.035, sz), district: index, base: 0.45 })
    } else if (dist.style === 'ai') {
      // AI / HCI research: ribbed towers, vertical fins on the plaza face.
      parts.push(block(b, b.w, b.h, b.d, 0))
      for (const oz of [-0.25, 0, 0.25]) parts.push(block(b, 0.05, b.h - 0.5, 0.12, 1.35, b.d / 2 + 0.05, oz, 0.015))
    } else if (dist.style === 'tools') {
      // Programming and tools: low, long infrastructure blocks with a line of light along the top edge.
      parts.push(block(b, b.w, b.h, b.d, 0))
      lights.push({ matrix: lightBox(b.x, b.z, b.yaw, b.d / 2 + 0.005, b.h - 0.08, 0, 0.015, 0.03, b.w - 0.2), district: index, base: 0.15 })
    } else {
      // Languages: standing stones, one per language.
      parts.push(block(b, b.w, b.h, b.d, 0, 0, 0, 0.02))
    }
    proxies.push(new BoxGeometry(b.d, b.h, b.w).translate(0, b.h / 2, 0).rotateY(b.yaw).translate(b.x, 0, b.z))
    // The skill's label plate: a slanted slab on a low stand in front of the building, tilted up
    // toward the camera so its words read comfortably from the plaza.
    const plate = new RoundedBoxGeometry(0.06, PLATE.h, PLATE.w, 1, 0.015).rotateZ(PLATE.tilt).translate(b.d / 2 + PLATE.gap, 0.42, 0)
    const stand = new RoundedBoxGeometry(0.22, 0.24, PLATE.w * 0.7, 1, 0.02).translate(b.d / 2 + PLATE.gap + 0.04, 0.12, 0)
    for (const g of [plate, stand]) {
      g.rotateY(b.yaw).translate(b.x, 0, b.z)
      g.deleteAttribute('uv')
      parts.push(g.toNonIndexed())
    }
    // Windows above the label on the skyline towers: a deterministic scatter, faint until discovered.
    if (dist.style === 'game' || dist.style === 'xr' || dist.style === 'ai') {
      const front = (dist.style === 'game' ? b.d * 0.78 : b.d) / 2 + 0.012
      for (let y = 1.55; y < b.h * (dist.style === 'game' ? 0.82 : 0.95) - 0.2; y += 0.34) {
        for (const oz of [-0.17, 0.17]) {
          const hsh = Math.sin(k * 12.9 + y * 7.3 + oz * 31 + index * 3.7) * 43758.5
          if (hsh - Math.floor(hsh) > 0.42) window(front, y, oz, 0.12)
        }
      }
    }
  })
  // The district's name stone, in front of it, facing the plaza; a floor line leads to it from the centre.
  const sr = SIGN_R
  const st = deg(place.centre)
  const sign = { x: sr * Math.cos(st), z: sr * Math.sin(st), theta: st }
  parts.push(block({ x: sign.x, z: sign.z, yaw: -(st + Math.PI) }, 1.9, 0.5, 0.16, 0))
  const lineLen = sr - 1.0
  lights.push({ matrix: lightBox(((1.0 + sr - 0.2) / 2) * Math.cos(st), ((1.0 + sr - 0.2) / 2) * Math.sin(st), -st, 0, 0.012, 0, lineLen - 0.2, 0.02, 0.06), district: index, base: 0.14 })
  return { geo: mergeGeometries(parts, false)!, proxy: mergeGeometries(proxies.map((p) => (p.deleteAttribute('uv'), p.toNonIndexed())), false)!, buildings, sign }
}

/** Text rotation that turns its +z face toward the plaza from bearing theta. */
const facePlaza = (theta: number) => Math.atan2(-Math.cos(theta), -Math.sin(theta))

export function SkillsV2({ island }: { island: IslandDef }) {
  const progress = useReveal(island.id)
  const districts = useMemo(() => skillDistricts(cv.skills.groups), [])
  const built = useMemo(() => {
    const lights: Light[] = []
    const ds = districts.map((d, i) => buildDistrict(d, i, lights))
    return { ds, lights, mats: districts.map(() => fadingConcreteMaterial('#e9e5dc', { lite: true })) }
  }, [districts])
  const lightGeo = useMemo(() => new BoxGeometry(1, 1, 1), [])
  // Warm-up: the faded (transparent) form of the lite concrete, on a hidden mesh, so the startup
  // precompile covers it and a district fading for the camera never compiles a shader mid-game.
  const warmMat = useMemo(() => {
    const m = fadingConcreteMaterial('#e9e5dc', { lite: true })
    m.transparent = true
    m.opacity = 0.5
    return m
  }, [])
  const lightMat = useMemo(() => new MeshBasicMaterial({ color: '#ffffff', toneMapped: false }), [])
  const lightsRef = useRef<InstancedMesh>(null)
  const pads = useRef<InstancedMesh>(null)
  const groups = useRef<(Object3D | null)[]>([])
  const proxies = useRef<(Object3D | null)[]>([])
  const camera = useThree((s) => s.camera)
  const texts = useRef<{ obj: Object3D; district: number }[]>([])
  const col = useMemo(() => new Color(), [])
  const state = useRef({ found: districts.map(() => false), lit: districts.map(() => 0), risen: districts.map(() => false), key: '' })
  const padCount = built.ds.reduce((n, d) => n + d.buildings.length, 0)
  const outward = v.angleOf(island.centre)

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
      let k = 0
      for (const d of built.ds) {
        for (const b of d.buildings) {
          tmp.position.set(b.x, 0.012, b.z)
          tmp.rotation.set(0, b.yaw, 0)
          tmp.scale.set(b.d + PAD_SPREAD * 2, 1, b.w + PAD_SPREAD * 2)
          tmp.updateMatrix()
          p.setMatrixAt(k++, tmp.matrix)
        }
      }
      p.instanceMatrix.needsUpdate = true
    }
  }, [built, col])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1)
    const st = state.current
    syncFadeTransparency(built.mats as MeshLambertMaterial[])
    // First visit: the skyline rises district by district.
    const p = progress.current
    built.ds.forEach((_, i) => {
      const g = groups.current[i]
      if (!g) return
      const t = reducedMotion() ? (p > 0 ? 1 : 0) : easeOutCubic(p * 1.6 - i * 0.12)
      g.scale.y = Math.max(0.001, t)
      st.risen[i] = t > 0.98 // windows and labels appear once their district stands
    })
    // Discovery: reaching a district's name stone (per visit) lights its windows and cues the kokedama.
    const dx = sim.player.pos.x - island.centre.x
    const dz = sim.player.pos.z - island.centre.z
    const lx = dx * Math.cos(outward) + dz * Math.sin(outward)
    const lz = -dx * Math.sin(outward) + dz * Math.cos(outward)
    built.ds.forEach((d, i) => {
      if (!st.found[i] && Math.hypot(lx - d.sign.x, lz - d.sign.z) < FIND_RANGE) {
        st.found[i] = true
        guideCue.seq++
      }
      st.lit[i] += ((st.found[i] ? 1 : 0) - st.lit[i]) * (1 - Math.exp(-dt * 3))
    })
    const m = lightsRef.current
    const key = `${built.mats.map((mt, i) => (mt.opacity > 0.5 && st.risen[i] ? 1 : 0)).join('')}|${st.lit.map((x) => x.toFixed(3)).join(',')}`
    if (m && key !== st.key) {
      st.key = key
      built.lights.forEach((l, i) => {
        m.setMatrixAt(i, built.mats[l.district].opacity > 0.5 && st.risen[l.district] ? l.matrix : HIDDEN)
        m.setColorAt(i, col.copy(DIM).lerp(LIT, l.base + st.lit[l.district] * (1 - l.base) * (l.base < 0.3 ? 0.85 : 1)))
      })
      m.instanceMatrix.needsUpdate = true
      if (m.instanceColor) m.instanceColor.needsUpdate = true
    }
    // A district also fades when the camera passes right beside one of its buildings (not only when
    // a building sits between camera and player), so towers never fill the frame from up close.
    const cx = camera.position.x - island.centre.x
    const cz = camera.position.z - island.centre.z
    const clx = cx * Math.cos(outward) + cz * Math.sin(outward)
    const clz = -cx * Math.sin(outward) + cz * Math.cos(outward)
    built.ds.forEach((d, i) => {
      const proxy = proxies.current[i]
      if (proxy) proxy.userData.forceFade = d.buildings.some((b) => Math.hypot(clx - b.x, clz - b.z) < Math.max(b.w, b.d) / 2 + 2.0 && camera.position.y < b.h + 1.6)
    })
    const near = Math.hypot(dx, dz) < TEXT_RANGE
    for (const t of texts.current) t.obj.visible = near && st.risen[t.district] && built.mats[t.district].opacity > 0.25
  })

  const textRef = (district: number) => (o: Object3D | null) => {
    if (o && !texts.current.some((t) => t.obj === o)) texts.current.push({ obj: o, district })
  }

  return (
    <IslandBase island={island}>
      {districts.map((dist, i) => {
        const d = built.ds[i]
        return (
          <group key={dist.label}>
            <group ref={(g) => void (groups.current[i] = g)}>
              {/* Drawn before the island slab, so slab pixels behind the buildings are rejected by depth. */}
              <mesh name={`v2-district-${dist.style}`} geometry={d.geo} material={built.mats[i]} renderOrder={-1} />
            </group>
            <mesh ref={(m) => void (proxies.current[i] = m)} geometry={d.proxy} material={built.mats[i]} visible={false} userData={{ blocksCamera: true, fadeOnBlock: true }} />
            {/* The district's name, engraved on its stone. */}
            <Text
              name="v2-engraving"
              ref={textRef(i)}
              font={TITLE_FONT}
              position={[d.sign.x - Math.cos(d.sign.theta) * 0.085, 0.27, d.sign.z - Math.sin(d.sign.theta) * 0.085]}
              rotation={[0, facePlaza(d.sign.theta), 0]}
              fontSize={dist.label.length > 16 ? 0.17 : 0.2}
              color="#4b4842"
              anchorX="center"
              anchorY="middle"
              maxWidth={1.8}
            >
              {dist.label}
            </Text>
            {/* Each building's skill, in the CV's exact words, on its slanted plate facing the plaza. */}
            {d.buildings.map((b) => (
              <group key={b.label} position={[b.x, 0, b.z]} rotation={[0, b.yaw, 0]}>
                <group position={[b.d / 2 + PLATE.gap, 0.42, 0]} rotation={[0, 0, PLATE.tilt]}>
                  <Text
                    name="v2-engraving"
                    ref={textRef(i)}
                    font={TITLE_FONT}
                    position={[0.032, 0, 0]}
                    rotation={[0, Math.PI / 2, 0]}
                    fontSize={0.095}
                    lineHeight={1.18}
                    color="#46433d"
                    anchorX="center"
                    anchorY="middle"
                    textAlign="center"
                    maxWidth={PLATE.w - 0.1}
                  >
                    {b.label}
                  </Text>
                </group>
              </group>
            ))}
          </group>
        )
      })}
 <mesh geometry={lightGeo} material={warmMat} visible={false} />
      <instancedMesh name="v2-city-lights" ref={lightsRef} args={[lightGeo, lightMat, built.lights.length]} />
      <BlockShadows ref={pads} count={padCount} />
    </IslandBase>
  )
}

const HIDDEN = new Matrix4().makeScale(1e-4, 1e-4, 1e-4)
