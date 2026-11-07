import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { BoxGeometry, CircleGeometry, CylinderGeometry, ExtrudeGeometry, MeshBasicMaterial, Path, Shape, SphereGeometry, type BufferGeometry, type Group } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { IslandDef } from '../../content/world'
import { IslandBase } from '../islands/IslandBase'
import { easeOutCubic, useReveal } from '../reveals/useReveal'
import { concreteMaterial } from './concrete'
import { ContactShadow } from './ContactShadow'
import { ACADEMY, PODIUM_TOP } from './educationLayout'

// Education & Research: a small observatory-university. A stepped podium and a portico of six columns
// under a pediment, an arched doorway glowing from within, and on the roof a dome with its slit open
// toward the arrival ring and a telescope pointing out into the void. Book-spine stacks stand against
// the hall's sides; on reveal they slide out like books drawn from a shelf. Island-local space.

/** Chamfered box from extents, ready to merge (non-indexed, no uv). */
function block(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, r = 0.04): BufferGeometry {
  const g = new RoundedBoxGeometry(x1 - x0, y1 - y0, z1 - z0, 1, Math.min(r, (x1 - x0) / 2.2, (y1 - y0) / 2.2, (z1 - z0) / 2.2))
  return ready(g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2))
}

function ready(g: BufferGeometry): BufferGeometry {
  const out = g.index ? g.toNonIndexed() : g
  if (out.getAttribute('uv')) out.deleteAttribute('uv')
  return out
}

/** A shape in the (z, y) plane, extruded toward -x from `xFront + depth` to `xFront`. */
function facade(shape: Shape, xFront: number, depth: number, bevel = 0.03): BufferGeometry {
  const g = new ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 1, curveSegments: 24 })
  g.rotateY(-Math.PI / 2) // shape x → z, extrusion → -x
  return ready(g.translate(xFront + depth, 0, 0))
}

/** The pale stone: podium steps, portico, arched front wall, hall, roof and pediment. */
function massGeometry(): BufferGeometry {
  const { podium, columns, hall, arch, roof, pediment } = ACADEMY
  const parts: BufferGeometry[] = []
  for (let i = 0; i < podium.steps; i++) parts.push(block(podium.x0 + i * podium.run, podium.x1, 0, (i + 1) * podium.rise, -podium.z, podium.z, 0.025))
  const top = PODIUM_TOP
  // The portico: six columns, each on a square base under a square capital.
  for (const z of columns.z) {
    parts.push(block(columns.x - 0.21, columns.x + 0.21, top, top + 0.12, z - 0.21, z + 0.21, 0.02))
    parts.push(ready(new CylinderGeometry(columns.r * 0.9, columns.r, columns.top - 0.15 - top - 0.12, 10).translate(columns.x, (top + 0.12 + columns.top - 0.15) / 2, z)))
    parts.push(block(columns.x - 0.23, columns.x + 0.23, columns.top - 0.15, columns.top, z - 0.23, z + 0.23, 0.02))
  }
  // The arched front wall, a keystone over the arch, and the hall block behind it.
  const wall = new Shape()
  wall.moveTo(-hall.z, top)
  wall.lineTo(hall.z, top)
  wall.lineTo(hall.z, hall.h)
  wall.lineTo(-hall.z, hall.h)
  wall.lineTo(-hall.z, top)
  const door = new Path()
  door.moveTo(-arch.half, top)
  door.lineTo(-arch.half, arch.spring)
  door.absarc(0, arch.spring, arch.half, Math.PI, 0, true)
  door.lineTo(arch.half, top)
  door.lineTo(-arch.half, top)
  wall.holes.push(door)
  parts.push(facade(wall, hall.x0, hall.front))
  parts.push(block(hall.x0 - 0.06, hall.x0 + 0.04, arch.spring + arch.half - 0.02, arch.spring + arch.half + 0.2, -0.12, 0.12, 0.015))
  parts.push(block(hall.x0 + hall.front, hall.x1, top, hall.h, -hall.z, hall.z, 0.05))
  // Roof slab, and a cornice band along its front edge.
  parts.push(block(roof.x0, roof.x1, roof.y0, roof.y1, -roof.z, roof.z, 0.05))
  parts.push(block(roof.x0 - 0.06, roof.x0 + 0.1, roof.y1 - 0.1, roof.y1 + 0.02, -roof.z - 0.04, roof.z + 0.04, 0.02))
  // The pediment, with raking cornices along its two slopes.
  const tri = new Shape()
  tri.moveTo(-roof.z, roof.y1)
  tri.lineTo(roof.z, roof.y1)
  tri.lineTo(0, pediment.apex)
  tri.lineTo(-roof.z, roof.y1)
  parts.push(facade(tri, pediment.x0, pediment.depth, 0.02))
  const slope = Math.atan2(pediment.apex - roof.y1, roof.z)
  const len = Math.hypot(roof.z, pediment.apex - roof.y1) + 0.12
  for (const side of [-1, 1]) {
    const g = new RoundedBoxGeometry(pediment.depth + 0.12, 0.09, len, 1, 0.025)
    g.rotateX(-side * slope)
    parts.push(ready(g.translate(pediment.x0 + pediment.depth / 2 - 0.05, (roof.y1 + pediment.apex) / 2 + 0.06, (-side * roof.z) / 2)))
  }
  return mergeGeometries(parts, false)!
}

/** Turns a part of the slit or telescope about the dome's vertical axis by the dome's azimuth. */
function turned(g: BufferGeometry): BufferGeometry {
  const { dome } = ACADEMY
  return g.translate(-dome.x, 0, 0).rotateY(dome.az).translate(dome.x, 0, 0)
}

/** The observatory: drum, cornice ring, dome and telescope (a slightly darker stone). */
function domeGeometry(): BufferGeometry {
  const { dome, roof } = ACADEMY
  const y0 = roof.y1
  const base = y0 + dome.drum
  const toward = Math.PI / 2 + dome.scope // the telescope's tilt: out toward the arrival ring (-x) and up
  const scopeDir = { x: -Math.cos(dome.scope), y: Math.sin(dome.scope) }
  const scopeAt = (d: number) => [dome.x + scopeDir.x * d, base + scopeDir.y * d, 0] as const
  return mergeGeometries(
    [
      ready(new CylinderGeometry(dome.r, dome.r + 0.04, dome.drum, 24).translate(dome.x, y0 + dome.drum / 2, 0)),
      ready(new CylinderGeometry(dome.r + 0.1, dome.r + 0.1, 0.08, 24).translate(dome.x, base, 0)),
      ready(new SphereGeometry(dome.r, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(dome.x, base, 0)),
      turned(ready(new CylinderGeometry(0.085, 0.11, 1.3, 10).rotateZ(toward - Math.PI / 2).translate(...scopeAt(dome.r + 0.05)))),
      turned(ready(new CylinderGeometry(0.14, 0.14, 0.22, 10).rotateZ(toward - Math.PI / 2).translate(...scopeAt(dome.r + 0.62)))),
    ],
    false,
  )!
}

/** Every light, one unlit draw: the doorway's glow, the line under the portico, the oculus and the dome's slit. */
function glowGeometry(): BufferGeometry {
  const { hall, arch, roof, pediment, dome } = ACADEMY
  const top = PODIUM_TOP
  const parts: BufferGeometry[] = [
    ready(new BoxGeometry(0.01, arch.spring + arch.half - top, arch.half * 2).translate(hall.x0 + hall.front - 0.006, (top + arch.spring + arch.half) / 2, 0)),
    ready(new BoxGeometry(0.06, 0.035, roof.z * 2 - 0.2).translate(roof.x0 + 0.08, roof.y0 - 0.02, 0)),
    ready(new CircleGeometry(0.17, 20).rotateY(-Math.PI / 2).translate(pediment.x0 - 0.004, roof.y1 + (pediment.apex - roof.y1) * 0.42, 0)),
  ]
  // The slit: short tangent strips along the dome's meridian on the side facing the arrival ring.
  const base = roof.y1 + dome.drum
  const n = 12
  for (let k = 0; k < n; k++) {
    const t = dome.slitFrom + ((k + 0.5) / n) * (dome.slitTo - dome.slitFrom)
    const seg = ((dome.slitTo - dome.slitFrom) / n) * dome.r + 0.01
    const g = new BoxGeometry(0.02, seg, 0.2).rotateZ(-t)
    parts.push(turned(ready(g.translate(dome.x - Math.cos(t) * (dome.r + 0.006), base + Math.sin(t) * (dome.r + 0.006), 0))))
  }
  return mergeGeometries(parts, false)!
}

type Stack = { x: number; side: 1 | -1; h: number; lean: number; i: number }

/** Book-spine stacks against both side walls, leaning back onto them. */
function useStacks(): Stack[] {
  return useMemo(() => {
    const { x, h } = ACADEMY.stacks
    const out: Stack[] = []
    for (const side of [-1, 1] as const) x.forEach((sx, k) => out.push({ x: sx, side, h: side === 1 ? h[k] : h[h.length - 1 - k], lean: -side * (0.04 + (k % 2) * 0.03), i: out.length }))
    return out
  }, [])
}

/** Education & Research: the observatory academy. Reveal: the book stacks slide out of the walls. */
export function EducationV2({ island }: { island: IslandDef }) {
  const progress = useReveal(island.id)
  const mass = useMemo(() => massGeometry(), [])
  const dome = useMemo(() => domeGeometry(), [])
  const glow = useMemo(() => glowGeometry(), [])
  const glowMat = useMemo(() => new MeshBasicMaterial({ color: '#fff2d8', toneMapped: false }), [])
  const stacks = useStacks()
  const { stacks: S } = ACADEMY
  const spineGeo = useMemo(() => new RoundedBoxGeometry(S.w, 1, S.z1 - S.z0, 2, 0.05), [S])
  const refs = useRef<(Group | null)[]>([])
  const mid = (S.z0 + S.z1) / 2

  useFrame(() => {
    const p = progress.current
    for (const s of stacks) {
      const g = refs.current[s.i]
      if (!g) continue
      const order = s.side === 1 ? s.i - S.x.length : s.i
      const t = easeOutCubic(p * 1.7 - order * 0.12)
      g.position.z = s.side * (mid - (1 - t) * 0.3)
      g.position.y = PODIUM_TOP - (1 - t) * 0.5
    }
  })

  return (
    <IslandBase island={island}>
      <ContactShadow position={[2.75, 0, 0]} size={[5.8, 6.4]} opacity={0.6} />
      <mesh name="v2-archive" geometry={mass} material={concreteMaterial('#ebe7df')} />
      <mesh name="v2-observatory" geometry={dome} material={concreteMaterial('#d6d2c9')} />
      <mesh name="v2-academy-glow" geometry={glow} material={glowMat} />
      {stacks.map((s) => (
        <group key={s.i} ref={(r) => void (refs.current[s.i] = r)} position={[s.x, PODIUM_TOP, s.side * mid]}>
          <mesh name="v2-spine" geometry={spineGeo} material={concreteMaterial(s.i % 3 === 0 ? '#d9d5cc' : '#e4e0d7')} position={[0, s.h / 2, 0]} scale={[1, s.h, 1]} rotation={[s.lean, 0, 0]} />
        </group>
      ))}
    </IslandBase>
  )
}
