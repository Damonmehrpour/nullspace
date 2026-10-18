import { Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { BoxGeometry, Color, ExtrudeGeometry, IcosahedronGeometry, MeshBasicMaterial, MeshLambertMaterial, Object3D, Path, Shape, type BufferGeometry, type InstancedMesh } from 'three'
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
import { concreteMaterial } from './concrete'
import { guideCue } from './cues'
import { experienceChapters, type Chapter, type PortalStyle } from './experienceChapters'

// Experience: a monumental corridor of portals, one per career chapter, oldest nearest the arrival
// point and the newest at the island's edge, framing the open void ahead. Island-local space: +x
// points outward (away from the monolith), the path runs along +x, z is across it.

type Spec = { x: number; H: number; W: number; jw: number; D: number }
const SPECS: Record<Exclude<PortalStyle, 'generic'>, Spec> = {
  medrick: { x: -0.7, H: 3.6, W: 1.8, jw: 0.6, D: 0.7 },
  ubicomp: { x: 1.15, H: 4.1, W: 2.0, jw: 0.62, D: 0.6 },
  oasis: { x: 3.0, H: 4.6, W: 2.9, jw: 0.35, D: 0.8 },
  arvo: { x: 4.95, H: 5.3, W: 2.3, jw: 0.7, D: 0.75 },
}
const LINTEL = 0.75
const STELE = { x: 0.22, z: 1.85 }
const DIM = new Color('#34383d')
const LIT = new Color('#eef6e4')
const TEXT_RANGE = 16 // engravings render only when the player is near (they're unreadable from afar)

/** Chamfered box from extents (portal-local). */
function box(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, r = 0.04): BufferGeometry {
  const g = new RoundedBoxGeometry(x1 - x0, y1 - y0, z1 - z0, 1, Math.min(r, (x1 - x0) / 2.2, (y1 - y0) / 2.2, (z1 - z0) / 2.2))
  return g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2).toNonIndexed()
}

/** Light elements are unit boxes in one instanced draw: lit by the reveal (scale) or by discovery (colour). */
type Light = { pos: [number, number, number]; size: [number, number, number]; portal: number; kind: 'reveal' | 'discover'; base: number }

function portalGeometry(style: Exclude<PortalStyle, 'generic'>, s: Spec, portal: number, lights: Light[]): BufferGeometry {
  const { H, W, jw, D, x } = s
  const parts: BufferGeometry[] = []
  const lightAt = (px: number, py: number, pz: number, sx: number, sy: number, sz: number, kind: Light['kind'] = 'discover', base = 0.12) =>
    lights.push({ pos: [x + px, py, pz], size: [sx, sy, sz], portal, kind, base })
  const top = H - LINTEL
  // Every portal: a threshold strip in the floor that lights when you pass, and a light slot under the lintel.
  lightAt(0, 0.012, 0, 0.12, 0.02, W - 0.2)
  if (style !== 'oasis') lightAt(0, top - 0.025, 0, Math.min(0.3, D - 0.2), 0.05, W - 0.15, 'reveal')

  if (style === 'medrick') {
    // Mobile games: a tall, phone-proportioned opening with stepped "pixel" corners, and four inset
    // tiles on the left jamb, one for each released title.
    parts.push(box(-D / 2, D / 2, 0, H, -W / 2 - jw, -W / 2), box(-D / 2, D / 2, 0, H, W / 2, W / 2 + jw))
    parts.push(box(-D / 2 - 0.05, D / 2 + 0.05, top, H, -W / 2 - jw - 0.1, W / 2 + jw + 0.1))
    const st = 0.17
    for (let k = 0; k < 3; k++) {
      for (const side of [-1, 1]) {
        const z0 = side < 0 ? -W / 2 : W / 2 - (3 - k) * st
        parts.push(box(-D / 2 + 0.05, D / 2 - 0.05, top - (k + 1) * st, top - k * st, z0, z0 + (3 - k) * st, 0.02))
      }
    }
    for (let i = 0; i < 4; i++) parts.push(box(-D / 2 - 0.05, -D / 2 + 0.02, 0.75 + i * 0.5, 1.05 + i * 0.5, -W / 2 - jw + 0.15, -W / 2 - 0.15, 0.015))
  } else if (style === 'ubicomp') {
    // Research: jambs open into a lattice of fins (controlled environments), and a sensing waveform
    // across the lintel face that lights on discovery.
    for (const side of [-1, 1]) {
      for (let f = 0; f < 3; f++) {
        const z = side * (W / 2 + 0.07 + f * 0.24)
        parts.push(box(-D / 2, D / 2, 0, top + 0.02, z - 0.06, z + 0.06, 0.02))
      }
    }
    parts.push(box(-D / 2 - 0.05, D / 2 + 0.05, top, H, -W / 2 - jw - 0.12, W / 2 + jw + 0.12))
    const bars = 23
    for (let i = 0; i < bars; i++) {
      const u = i / (bars - 1)
      const spike = Math.exp(-((u - 0.62) ** 2) / 0.002) * 0.9 + Math.exp(-((u - 0.55) ** 2) / 0.001) * -0.35
      const h = 0.06 + Math.abs(Math.sin(u * 17) * 0.06) + Math.max(0, spike) * 0.3
      lightAt(-D / 2 - 0.06, top + LINTEL * 0.3, (u - 0.5) * (W + 0.6), 0.02, h, 0.035)
    }
  } else if (style === 'oasis') {
    // XR meditation: a moon gate. A thick slab pierced by a round opening that reaches the floor,
    // ringed by points of light, with a small patch of moss at its foot.
    const half = W / 2 + jw
    const r = 1.42
    const shape = new Shape()
    shape.moveTo(-half, 0)
    shape.lineTo(half, 0)
    shape.lineTo(half, H)
    shape.lineTo(-half, H)
    shape.lineTo(-half, 0)
    const hole = new Path()
    hole.absarc(0, r + 0.04, r, 0, Math.PI * 2, true)
    shape.holes.push(hole)
    const g = new ExtrudeGeometry(shape, { depth: D, bevelEnabled: true, bevelSize: 0.035, bevelThickness: 0.035, bevelSegments: 1, curveSegments: 48 })
    g.rotateY(-Math.PI / 2)
    g.translate(D / 2, 0, 0)
    g.deleteAttribute('uv')
    parts.push(g.toNonIndexed())
    const dots = 28
    for (let i = 0; i < dots; i++) {
      const a = (i / dots) * Math.PI * 2
      const y = r + 0.04 + Math.sin(a) * (r + 0.2)
      if (y < 0.15) continue
      lightAt(-D / 2 - 0.045, y, Math.cos(a) * (r + 0.2), 0.02, 0.05, 0.05)
    }
  } else {
    // Lead XR engineer: the tallest gate. The lintel cantilevers past one jamb, and a thin floating
    // frame of light hangs in front of it, like an augmented layer over the real one.
    parts.push(box(-D / 2, D / 2, 0, H, -W / 2 - jw, -W / 2), box(-D / 2, D / 2, 0, H, W / 2, W / 2 + jw))
    parts.push(box(-D / 2 - 0.05, D / 2 + 0.05, top, H, -W / 2 - jw - 0.1, W / 2 + jw + 1.3))
    const gx = -D / 2 - 0.5
    const gw = W / 2 + 0.2
    const gh = top - 0.35
    // The augmented layer is always faintly present; discovery brings it fully up.
    lightAt(gx, 0.15 + (gh - 0.15) / 2, -gw, 0.04, gh - 0.15, 0.04, 'discover', 0.5)
    lightAt(gx, 0.15 + (gh - 0.15) / 2, gw, 0.04, gh - 0.15, 0.04, 'discover', 0.5)
    lightAt(gx, gh, 0, 0.04, 0.04, gw * 2 + 0.04, 'discover', 0.5)
  }
  const merged = mergeGeometries(parts.map((p) => (p.getAttribute('uv') ? (p.deleteAttribute('uv'), p) : p)), false)!
  return merged.translate(x, 0, 0)
}

/**
 * Invisible, low-poly stand-in for a portal that the camera raycasts against (two jambs and the lintel,
 * or the moon gate's band and sides): testing the real chamfered geometry cost ~2k triangle tests per
 * portal per frame. It shares the portal's material, so the camera's fade still applies to the portal.
 */
function proxyGeometry(style: Exclude<PortalStyle, 'generic'>, s: Spec): BufferGeometry {
  const { H, W, jw, D, x } = s
  const top = H - LINTEL
  const plain = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) =>
    new BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2).toNonIndexed()
  const half = W / 2 + jw
  const parts =
    style === 'oasis'
      ? [plain(-D / 2, D / 2, 2.95, H, -half, half), plain(-D / 2, D / 2, 0, 2.95, -half, -1.1), plain(-D / 2, D / 2, 0, 2.95, 1.1, half)]
      : [plain(-D / 2, D / 2, top, H, -half, half + (style === 'arvo' ? 1.2 : 0)), plain(-D / 2, D / 2, 0, top, -half, -W / 2), plain(-D / 2, D / 2, 0, top, W / 2, half)]
  return mergeGeometries(parts.map((g) => (g.deleteAttribute('uv'), g)), false)!.translate(x, 0, 0)
}

/** The minor chapter (tutoring) as a low stele beside the path, between the portals it falls between. */
function steleGeometry(): BufferGeometry {
  return box(-0.13, 0.13, 0, 1.25, -0.45, 0.45, 0.03).translate(STELE.x, 0, STELE.z)
}

/** A few soft moss cushions at the moon gate's foot: the kokedama's kind, quietly at home here. */
function mossGeometry(): BufferGeometry {
  const s = SPECS.oasis
  const parts = [
    [0.15, 0.95, 0.16],
    [0.32, 1.12, 0.11],
    [-0.05, 1.18, 0.09],
    [0.42, 0.78, 0.07],
  ].map(([dx, dz, r]) => new IcosahedronGeometry(r, 1).scale(1, 0.55, 1).translate(s.x - s.D / 2 - dx, r * 0.25, dz).toNonIndexed())
  return mergeGeometries(parts, false)!
}

/**
 * Lambert concrete per portal, so each can fade when it blocks the camera (like the monolith). It
 * stays opaque until it actually fades: four telescoping gates drawn as transparent shaded every
 * pixel up to four times (measured +21 ms on the pixel-bound profile). Both variants are already
 * compiled at startup (the monolith uses the transparent one), so switching costs nothing.
 */
function fadingConcrete(): MeshLambertMaterial {
  const base = concreteMaterial('#ebe7df')
  const m = base.clone()
  m.onBeforeCompile = base.onBeforeCompile
  m.customProgramCacheKey = base.customProgramCacheKey
  return m
}

export function ExperienceV2({ island }: { island: IslandDef }) {
  const progress = useReveal(island.id)
  const chapters = useMemo(() => experienceChapters(cv.experience.entries), [])
  const portals = useMemo(() => chapters.filter((c): c is Chapter & { style: Exclude<PortalStyle, 'generic'> } => !c.minor && c.style !== 'generic'), [chapters])
  const minor = chapters.find((c) => c.minor)
  const built = useMemo(() => {
    const lights: Light[] = []
    const geos = portals.map((c, i) => portalGeometry(c.style, SPECS[c.style], i, lights))
    return { geos, lights, proxies: portals.map((c) => proxyGeometry(c.style, SPECS[c.style])), mats: portals.map(() => fadingConcrete()) }
  }, [portals])
  const stele = useMemo(() => steleGeometry(), [])
  const moss = useMemo(() => mossGeometry(), [])
  const mossMat = useMemo(() => new MeshLambertMaterial({ color: '#5f9a34', emissive: new Color('#1e3d0d'), emissiveIntensity: 0.5 }), [])
  const lightGeo = useMemo(() => new BoxGeometry(1, 1, 1), [])
  const lightMat = useMemo(() => new MeshBasicMaterial({ color: '#ffffff', toneMapped: false }), [])
  const lightsRef = useRef<InstancedMesh>(null)
  const pads = useRef<InstancedMesh>(null)
  const texts = useRef<(Object3D | null)[]>([])
  const state = useRef({ discovered: portals.map(() => 0), passed: portals.map(() => false), lastX: null as number | null, near: false, lightKey: '' })
  const tmp = useMemo(() => new Object3D(), [])
  const col = useMemo(() => new Color(), [])
  const outward = v.angleOf(island.centre)

  // Give the lights their per-instance colours at mount, before the precompile runs: creating the
  // colour buffer later switches the shader variant and compiled it when the island first came into view.
  useLayoutEffect(() => {
    const m = lightsRef.current
    if (!m) return
    built.lights.forEach((l, i) => m.setColorAt(i, l.kind === 'reveal' ? LIT : col.copy(DIM).lerp(LIT, l.base)))
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [built, col])

  useLayoutEffect(() => {
    const p = pads.current
    if (!p) return
    portals.forEach((c, i) => {
      const s = SPECS[c.style]
      tmp.position.set(s.x, 0.012, 0)
      tmp.rotation.set(0, 0, 0)
      tmp.scale.set(s.D + SHADOW_SPREAD * 2, 1, s.W + s.jw * 2 + SHADOW_SPREAD * 2)
      tmp.updateMatrix()
      p.setMatrixAt(i, tmp.matrix)
    })
    tmp.position.set(STELE.x, 0.012, STELE.z)
    tmp.scale.set(0.26 + SHADOW_SPREAD * 2, 1, 0.9 + SHADOW_SPREAD * 2)
    tmp.updateMatrix()
    p.setMatrixAt(portals.length, tmp.matrix)
    p.instanceMatrix.needsUpdate = true
  }, [portals, tmp])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1)
    const st = state.current
    for (const m of built.mats) {
      const fading = m.opacity < 0.999
      if (m.transparent !== fading) {
        m.transparent = fading
        m.needsUpdate = true
      }
    }
    // The player in island-local space (+x outward, z across).
    const dx = sim.player.pos.x - island.centre.x
    const dz = sim.player.pos.z - island.centre.z
    const lx = dx * Math.cos(outward) + dz * Math.sin(outward)
    const lz = -dx * Math.sin(outward) + dz * Math.cos(outward)
    // Walking through a portal for the first time (per visit) discovers that chapter.
    portals.forEach((c, i) => {
      const s = SPECS[c.style]
      if (!st.passed[i] && st.lastX !== null && Math.abs(lz) < s.W / 2 && Math.sign(st.lastX - s.x) !== Math.sign(lx - s.x) && Math.abs(lx - st.lastX) < 1) {
        st.passed[i] = true
        guideCue.seq++
      }
      st.discovered[i] += ((st.passed[i] ? 1 : 0) - st.discovered[i]) * (1 - Math.exp(-dt * 3))
    })
    st.lastX = lx
    st.near = Math.hypot(dx, dz) < TEXT_RANGE

    const m = lightsRef.current
    const p = progress.current
    // Rewrite and re-upload the light instances only when something visible changed.
    const key = `${Math.floor(p * portals.length * 1.1 - 0.5)}|${built.mats.map((mt) => (mt.opacity > 0.5 ? 1 : 0)).join('')}|${st.discovered.map((d) => d.toFixed(3)).join(',')}`
    if (m && key !== st.lightKey) {
      st.lightKey = key
      built.lights.forEach((l, i) => {
        tmp.position.set(...l.pos)
        tmp.rotation.set(0, 0, 0)
        // Reveal lights ignite one portal after another; discovery lights brighten when you pass.
        const on = l.kind === 'reveal' ? p * portals.length * 1.1 > l.portal + 0.5 : true
        // Lights vanish with their portal when it fades for the camera (no floating bars).
        const shown = on && built.mats[l.portal].opacity > 0.5
        // Collapse on every axis: a box flattened only in depth still shows its face down the corridor.
        if (shown) tmp.scale.set(...l.size)
        else tmp.scale.setScalar(1e-4)
        tmp.updateMatrix()
        m.setMatrixAt(i, tmp.matrix)
        m.setColorAt(i, l.kind === 'reveal' ? LIT : col.copy(DIM).lerp(LIT, l.base + st.discovered[l.portal] * (1 - l.base)))
      })
      m.instanceMatrix.needsUpdate = true
      if (m.instanceColor) m.instanceColor.needsUpdate = true
    }
    // Engravings fade with their portal when it turns translucent for the camera.
    texts.current.forEach((t, i) => {
      if (!t) return
      const mat = built.mats[Math.floor(i / 2)]
      const o = mat ? mat.opacity : 1
      t.visible = st.near && o > 0.25 // no ghost lettering over a faded portal
      ;(t as unknown as { fillOpacity: number }).fillOpacity = o
    })
  })

  return (
    <IslandBase island={island}>
      {portals.map((c, i) => {
        const s = SPECS[c.style]
        const face = -s.D / 2 - 0.06 // the lintel's approach face
        const ty = s.H - LINTEL / 2
        return (
          <group key={c.name}>
            <mesh name="v2-portal" geometry={built.geos[i]} material={built.mats[i]} />
            <mesh geometry={built.proxies[i]} material={built.mats[i]} visible={false} userData={{ blocksCamera: true, fadeOnBlock: true }} />
            {/* Career information is engraved into each lintel, facing the approach. */}
            <Text
              name="v2-engraving"
              ref={(t) => void (texts.current[i * 2] = t)}
              font={TITLE_FONT}
              position={[s.x + face, ty + 0.1, 0]}
              rotation={[0, -Math.PI / 2, 0]}
              fontSize={0.27}
              color="#55524b"
              anchorX="center"
              anchorY="bottom"
            >
              {c.name}
            </Text>
            <Text
              name="v2-engraving"
              ref={(t) => void (texts.current[i * 2 + 1] = t)}
              font={TITLE_FONT}
              position={[s.x + face, ty + 0.07, 0]}
              rotation={[0, -Math.PI / 2, 0]}
              fontSize={0.1}
              lineHeight={1.25}
              color="#6b675f"
              anchorX="center"
              anchorY="top"
              textAlign="center"
              maxWidth={s.W + s.jw * 2 - 0.2}
            >
              {`${c.role}\n${c.dates}`}
            </Text>
          </group>
        )
      })}
      {minor && (
        <>
          <mesh name="v2-stele" geometry={stele} material={concreteMaterial('#e2ded5')} />
          <Text font={TITLE_FONT} position={[STELE.x, 0.85, STELE.z - 0.46]} rotation={[0, Math.PI, 0]} fontSize={0.085} lineHeight={1.3} color="#6b675f" anchorX="center" anchorY="middle" textAlign="center" maxWidth={0.8}>
            {`${minor.role}\n${minor.dates}`}
          </Text>
        </>
      )}
      <mesh name="v2-moss" geometry={moss} material={mossMat} />
      <instancedMesh name="v2-portal-lights" ref={lightsRef} args={[lightGeo, lightMat, built.lights.length]} />
      <BlockShadows ref={pads} count={portals.length + 1} />
    </IslandBase>
  )
}
