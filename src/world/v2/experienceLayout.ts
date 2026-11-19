import type { Vec2 } from '../../core/geometry'
import type { Chapter } from './experienceChapters'

// The Experience island as the Memory Foundry: one workstation per career chapter around an open floor,
// Sämmi Studios (the newest) as the anchor at the back, the others in date order left to right as you
// arrive. Each station is discovered by walking up to it (no gates). Shared by the meshes
// (ExperienceV2), the colliders and the tests.
// Island-local space: +x points outward (toward the void), z across (+z is the arrival's right).
// Station-local space: u points out of the station's front, v across it (+v is a viewer's left as they
// face the station), y up. In three.js terms: x = u, z = v after a rotateY(-facing).

export type StationKind = 'medrick' | 'tutor' | 'ubicomp' | 'oasis' | 'arvo' | 'sammi'

/** Every station faces the open floor's centre. */
export const FLOOR_CENTRE: Vec2 = { x: 1.0, z: 0 }
/** The inlaid ring on the open floor: the foundry's shared floor, every station's inlay leaves from it. */
export const FLOOR_RING = { r: 2.0, w: 0.06 }
/** How close the player must come to a station's front to discover it (m). */
export const FIND_RANGE = 2.0

export type StationSpec = {
  /** Centre of the footprint (island-local). */
  x: number
  z: number
  /** Footprint half-extents: hu along the facing direction, hv across it. */
  hu: number
  hv: number
}

export const STATIONS: Record<StationKind, StationSpec> = {
  medrick: { x: -0.9, z: -4.1, hu: 0.6, hv: 0.8 },
  tutor: { x: 1.4, z: -4.2, hu: 0.55, hv: 0.7 },
  ubicomp: { x: 3.4, z: -3.0, hu: 0.5, hv: 0.85 },
  // Set back and kept below 4.4 m so it anchors the floor without hiding the stations either side.
  sammi: { x: 5.3, z: 0, hu: 1.1, hv: 1.25 },
  oasis: { x: 3.0, z: 3.4, hu: 1.0, hv: 1.0 },
  arvo: { x: 0.4, z: 4.2, hu: 0.55, hv: 0.85 },
}

export type Station = { chapter: Chapter; kind: StationKind; spec: StationSpec; facing: number }

const kindOf = (c: Chapter): StationKind | null => (c.minor ? 'tutor' : c.style === 'generic' ? null : c.style)

/** The direction (island-local angle) a station at (x, z) faces: toward the floor's centre. */
export function facingOf(spec: StationSpec): number {
  return Math.atan2(FLOOR_CENTRE.z - spec.z, FLOOR_CENTRE.x - spec.x)
}

/** The stations for the CV's chapters, in date order (chapters without a station are left out). */
export function stations(chapters: Chapter[]): Station[] {
  return chapters.flatMap((chapter) => {
    const kind = kindOf(chapter)
    if (!kind) return []
    const spec = STATIONS[kind]
    return [{ chapter, kind, spec, facing: facingOf(spec) }]
  })
}

/** A station-local point (u out of the front, v across) in island-local space. */
export function stationPoint(s: Pick<Station, 'spec' | 'facing'>, u: number, v: number): Vec2 {
  const c = Math.cos(s.facing)
  const n = Math.sin(s.facing)
  return { x: s.spec.x + u * c - v * n, z: s.spec.z + u * n + v * c }
}

/** Where the player stands to discover a station: just in front of it (OASIS: on its pad, before the seat). */
export function findPoint(s: Station): Vec2 {
  return s.kind === 'oasis' ? stationPoint(s, 0.35, 0) : stationPoint(s, s.spec.hu + 0.5, 0)
}

/** OASIS's plate stands on a pedestal at the pad's edge, beside the way in (station-local u, v). */
export const OASIS_PLATE = { u: 0.55, v: 0.75 }

/** A floor inlay: from the ring's edge out to a station (or the studio's door). */
export function spoke(to: Vec2): { from: Vec2; to: Vec2 } {
  const dx = to.x - FLOOR_CENTRE.x
  const dz = to.z - FLOOR_CENTRE.z
  const l = Math.hypot(dx, dz)
  return { from: { x: FLOOR_CENTRE.x + (dx / l) * FLOOR_RING.r, z: FLOOR_CENTRE.z + (dz / l) * FLOOR_RING.r }, to }
}

/** Sämmi Studios' doorway, where its inlay ends. */
export function studioDoor(): Vec2 {
  const spec = STATIONS.sammi
  return stationPoint({ spec, facing: facingOf(spec) }, spec.hu + 0.05, 0)
}

/** A station's solid footprint as island-local boxes (OASIS: only its seat; the pad is walkable). */
export type FootBox = { c: Vec2; hx: number; hz: number; yaw: number }
export function stationSolids(s: Station): FootBox[] {
  if (s.kind === 'oasis')
    return [
      { c: stationPoint(s, -0.45, 0), hx: 0.25, hz: 0.3, yaw: s.facing }, // the seat
      { c: stationPoint(s, OASIS_PLATE.u, OASIS_PLATE.v), hx: 0.18, hz: 0.25, yaw: s.facing }, // the plate's pedestal
    ]
  return [{ c: stationPoint(s, 0, 0), hx: s.spec.hu, hz: s.spec.hv, yaw: s.facing }]
}
