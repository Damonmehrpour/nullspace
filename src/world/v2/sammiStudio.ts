import { BoxGeometry, ExtrudeGeometry, Shape, type BufferGeometry } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { Light } from './ExperienceV2'
import { STUDIO, studioPoint, studioSpan } from './experienceLayout'

// Sämmi Studios as a building: a small indie game workshop under a sawtooth roof, with a loft tower
// whose roof pitches forward over the sign. Its windows and clerestories glow warm (the same löyly
// light as the SanaSauna exhibit, the studio's game); a Game of Life glider on the loft lights up when
// the player steps through the doorway. Built in studio-local space (u = x out of the front, v = z
// across it), then turned and placed on the island.

const PLINTH_H = 0.1

/** Chamfered box from studio-local extents. */
function box(u0: number, u1: number, y0: number, y1: number, v0: number, v1: number, r = 0.035): BufferGeometry {
  const g = new RoundedBoxGeometry(u1 - u0, y1 - y0, v1 - v0, 1, Math.min(r, (u1 - u0) / 2.2, (y1 - y0) / 2.2, (v1 - v0) / 2.2))
  g.deleteAttribute('uv')
  return g.translate((u0 + u1) / 2, (y0 + y1) / 2, (v0 + v1) / 2).toNonIndexed()
}

/** A profile in the (u, y) plane extruded across v0..v1. */
function prism(points: [number, number][], v0: number, v1: number, bevel = 0): BufferGeometry {
  const shape = new Shape()
  points.forEach(([u, y], i) => (i === 0 ? shape.moveTo(u, y) : shape.lineTo(u, y)))
  shape.closePath()
  const g = new ExtrudeGeometry(shape, { depth: v1 - v0 - bevel * 2, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 1 })
  g.deleteAttribute('uv')
  return g.translate(0, 0, v0 + bevel)
}

/** Studio-local geometry into island-local space. */
const place = (g: BufferGeometry) => g.rotateY(-STUDIO.facing).translate(STUDIO.x, 0, STUDIO.z)

/** The studio's concrete, as one merged geometry, and its light elements (added to `lights`). */
export function studioGeometry(portal: number, lights: Light[]): BufferGeometry {
  const { hall, loft, door, window: win, sign, plinth: m, crates } = STUDIO
  const parts: BufferGeometry[] = []
  const lightAt = (u: number, y: number, v: number, su: number, sy: number, sv: number, kind: Light['kind'], base: number) => {
    const p = studioPoint(u, v)
    lights.push({ pos: [p.x, y, p.z], size: [su, sy, sv], portal, kind, base, yaw: -STUDIO.facing })
  }
  const H = hall.h
  const dv = (door.v0 + door.v1) / 2
  const hv = (hall.v0 + hall.v1) / 2
  const [lo, hi] = studioSpan()

  // Plinth around the walls (a terrace in front of the loft), open at the doorway so the threshold is level with the floor.
  parts.push(box(hall.u0 - m, hall.u1 + m, 0, PLINTH_H, lo - m, door.v0))
  parts.push(box(hall.u0 - m, hall.u1 + m, 0, PLINTH_H, door.v1, hi + m))
  parts.push(box(hall.u0 - m, hall.u1 - door.depth, 0, PLINTH_H, door.v0, door.v1))

  // The hall's walls, with the doorway recessed into the front.
  parts.push(box(hall.u0, hall.u1, PLINTH_H, H, hall.v0, door.v0))
  parts.push(box(hall.u0, hall.u1, PLINTH_H, H, door.v1, hall.v1))
  parts.push(box(hall.u0, hall.u1 - door.depth, PLINTH_H, H, door.v0, door.v1))
  parts.push(box(hall.u1 - door.depth, hall.u1, door.h, H, door.v0, door.v1))
  parts.push(box(hall.u0 - 0.06, hall.u1 + 0.08, H, H + 0.1, hall.v0 - 0.06, hall.v1, 0.03)) // cornice

  // A warm interior seen through the doorway, and a threshold strip that lights when you step in.
  lightAt(hall.u1 - door.depth + 0.008, (PLINTH_H + door.h) / 2, dv, 0.012, door.h - PLINTH_H - 0.12, door.v1 - door.v0 - 0.18, 'warm', 0.8)
  lightAt(hall.u1, 0.012, dv, 0.12, 0.02, door.v1 - door.v0 - 0.2, 'discover', 0.12)
  // The canopy over the door, and a small lamp on the jamb beside it.
  parts.push(box(hall.u1 - 0.05, hall.u1 + 0.55, door.h + 0.08, door.h + 0.17, door.v0 - 0.22, door.v1 + 0.22, 0.03))
  parts.push(box(hall.u1, hall.u1 + 0.05, 1.7, 2.0, door.v1 + 0.08, door.v1 + 0.18, 0.015))
  lightAt(hall.u1 + 0.06, 1.85, door.v1 + 0.13, 0.03, 0.16, 0.07, 'warm', 1)

  // The workshop window: a warm pane behind a mullion and transom, on a sill.
  const wv = (win.v0 + win.v1) / 2
  lightAt(hall.u1 + 0.006, (win.y0 + win.y1) / 2, wv, 0.012, win.y1 - win.y0, win.v1 - win.v0, 'warm', 1)
  parts.push(box(hall.u1, hall.u1 + 0.04, win.y0, win.y1, wv - 0.025, wv + 0.025, 0.01))
  parts.push(box(hall.u1, hall.u1 + 0.04, 1.5, 1.55, win.v0, win.v1, 0.01))
  parts.push(box(hall.u1, hall.u1 + 0.09, win.y0 - 0.06, win.y0, win.v0 - 0.06, win.v1 + 0.06, 0.015))

  // A tall window in the end wall toward the walkway, and two narrow ones at the back.
  lightAt(-0.1, 1.6, hall.v1 + 0.006, 0.7, 1.1, 0.012, 'warm', 0.9)
  parts.push(box(-0.125, -0.075, 1.05, 2.15, hall.v1, hall.v1 + 0.04, 0.01))
  parts.push(box(-0.5, 0.3, 0.99, 1.05, hall.v1, hall.v1 + 0.08, 0.015))
  for (const v of [0.15, 1.15]) lightAt(hall.u0 - 0.006, 1.55, v, 0.012, 1.3, 0.3, 'warm', 0.85)

  // The sign board across the front, above the canopy (its lettering is drawn by ExperienceV2).
  parts.push(box(hall.u1, hall.u1 + 0.05, sign.y0, sign.y1, sign.v0, sign.v1, 0.02))

  // Sawtooth roof: two teeth with their glazed faces toward the front, the front one crowning the sign.
  const base = H + 0.1
  const rise = 0.6
  const d = (hall.u1 - hall.u0) / 2
  for (let k = 0; k < 2; k++) {
    const a = hall.u0 + k * d
    const b = a + d
    parts.push(prism([[a, base], [b, base], [b, base + rise]], hall.v0, hall.v1))
    const len = Math.hypot(d, rise) + 0.06
    parts.push(new RoundedBoxGeometry(len, 0.07, hall.v1 - hall.v0 + 0.1, 1, 0.02).rotateZ(Math.atan2(rise, d)).translate((a + b) / 2 - 0.02, base + rise / 2 + 0.05, hv).toNonIndexed())
    lightAt(b + 0.006, base + rise / 2 - 0.02, hv, 0.012, rise - 0.16, hall.v1 - hall.v0 - 0.24, 'warm', 0.9)
    for (const f of [0.25, 0.5, 0.75]) {
      const v = hall.v0 + (hall.v1 - hall.v0) * f
      parts.push(box(b, b + 0.03, base, base + rise - 0.04, v - 0.02, v + 0.02, 0.008))
    }
  }

  // The loft: a taller block whose roof pitches up toward the front, with a slit window and the glider.
  parts.push(prism([[loft.u0, PLINTH_H], [loft.u1, PLINTH_H], [loft.u1, loft.front], [loft.u0, loft.back]], loft.v0, loft.v1, 0.03))
  const pitch = Math.atan2(loft.front - loft.back, loft.u1 - loft.u0)
  const over = 0.28
  const capLen = (loft.u1 - loft.u0) / Math.cos(pitch) + over + 0.08
  parts.push(
    new RoundedBoxGeometry(capLen, 0.1, loft.v1 - loft.v0 + 0.16, 1, 0.03)
      .rotateZ(pitch)
      .translate((loft.u0 + loft.u1) / 2 + (over - 0.08) / 2, (loft.back + loft.front) / 2 + Math.tan(pitch) * ((over - 0.08) / 2) + 0.06, (loft.v0 + loft.v1) / 2)
      .toNonIndexed(),
  )
  lightAt(loft.u1 + 0.006, 2.5, loft.slit, 0.012, 2.2, 0.1, 'warm', 1)
  const GLIDER = ['.X.', '..X', 'XXX']
  const cell = 0.12
  const pitchCell = 0.155
  GLIDER.forEach((row, r) =>
    [...row].forEach((ch, c) => {
      const y = 4.18 - r * pitchCell - cell / 2
      const v = loft.glider + (1 - c) * pitchCell // the viewer's left is +v
      if (ch === 'X') lightAt(loft.u1 + 0.012, y, v, 0.02, cell, cell, 'discover', 0.25)
      else parts.push(box(loft.u1, loft.u1 + 0.02, y - cell / 2, y + cell / 2, v - cell / 2, v + cell / 2, 0.006))
    }),
  )

  // Workshop crates on the terrace in front of the loft.
  for (const c of crates) parts.push(new RoundedBoxGeometry(c.s, c.h, c.s, 1, 0.025).rotateY(c.yaw).translate(c.u, PLINTH_H + (c.y ?? 0) + c.h / 2, c.v).toNonIndexed())

  const merged = mergeGeometries(
    parts.map((p) => (p.getAttribute('uv') ? (p.deleteAttribute('uv'), p) : p)),
    false,
  )!
  return place(merged)
}

/** Invisible low-poly stand-in the camera raycasts against: the hall and the loft. */
export function studioProxy(): BufferGeometry {
  const { hall, loft } = STUDIO
  const plain = (u0: number, u1: number, y1: number, v0: number, v1: number) => {
    const g = new BoxGeometry(u1 - u0, y1, v1 - v0).translate((u0 + u1) / 2, y1 / 2, (v0 + v1) / 2).toNonIndexed()
    g.deleteAttribute('uv')
    return g
  }
  return place(mergeGeometries([plain(hall.u0, hall.u1, hall.h + 0.7, hall.v0, hall.v1), plain(loft.u0, loft.u1, loft.front, loft.v0, loft.v1)], false)!)
}

/** The studio's contact-shadow pad: centre (island-local), footprint size (u, v) and yaw. */
export function studioShadow(): { c: { x: number; z: number }; su: number; sv: number; yaw: number } {
  const { hall, plinth: m } = STUDIO
  const [lo, hi] = studioSpan()
  return {
    c: studioPoint((hall.u0 + hall.u1) / 2, (lo + hi) / 2),
    su: hall.u1 - hall.u0 + m * 2,
    sv: hi - lo + m * 2,
    yaw: -STUDIO.facing,
  }
}

/** The studio's solid parts as studio-local boxes [u0, u1, v0, v1] (for its colliders). */
export function studioSolids(): [number, number, number, number][] {
  const { hall, door, plinth: m } = STUDIO
  const [lo, hi] = studioSpan()
  return [
    [hall.u0 - m, hall.u1 + m, lo - m, door.v0], // the loft and its crate terrace, and the jamb beside the door
    [hall.u0 - m, hall.u1 + m, door.v1, hi + m], // the hall beyond the door: the lamp, the window and its sill
    [hall.u0 - m, hall.u1 - door.depth, door.v0, door.v1], // behind the doorway recess
  ]
}
