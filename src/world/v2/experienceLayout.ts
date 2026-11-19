import { DEFAULT_LAYOUT_PARAMS } from '../../content/world'
import type { Vec2 } from '../../core/geometry'
import type { Chapter, PortalStyle } from './experienceChapters'

// The Experience island: one long concrete wall between the arrival ring and the void, curved around
// the ring, pierced by one opening per career chapter in date order (left to right as you arrive).
// Minor chapters are a shallow niche instead of an opening. Shared by the meshes (ExperienceV2), the
// colliders and the tests. Island-local space: +x points outward, z across (+z is the arrival's right).

/** The wall: an arc of radius R around the arrival point, T thick, H high, with piers between bays. */
export const WALL = { R: 6.0, T: 0.6, H: 3.4, pier: { w: 0.4, h: 3.65 } }
/** Where the arc is centred: the arrival point. */
export const ARC_CENTRE: Vec2 = { x: -DEFAULT_LAYOUT_PARAMS.arrivalOffset, z: 0 }

/** Each bay's width along the wall, and the half-width a body can pass through (openings only). */
export type BayKind = Exclude<PortalStyle, 'generic'> | 'generic' | 'niche'
export const BAY: Record<BayKind, { w: number; gap: number }> = {
  medrick: { w: 1.6, gap: 0.55 },
  ubicomp: { w: 1.6, gap: 0.5 },
  oasis: { w: 2.6, gap: 0.75 },
  arvo: { w: 1.6, gap: 0.6 },
  sammi: { w: 2.0, gap: 0.55 },
  generic: { w: 1.6, gap: 0.55 },
  niche: { w: 1.2, gap: 0 },
}
/** The niche: a recess in the arrival face (not a way through). */
export const NICHE = { w: 0.9, h: 1.8, depth: 0.22 }
/** The bay the composition is centred on, straight ahead of the arrival ring. */
const ANCHOR: BayKind = 'oasis'

export type Bay = { chapter: Chapter; kind: BayKind; w: number; gap: number; angle: number; opening: boolean }

const kindOf = (c: Chapter): BayKind => (c.minor ? 'niche' : c.style)

/** The bays in date order, each with its angle around the arc (radians, 0 = straight out). */
export function wallBays(chapters: Chapter[]): Bay[] {
  const { R, pier } = WALL
  let s = pier.w
  const placed = chapters.map((chapter) => {
    const kind = kindOf(chapter)
    const { w, gap } = BAY[kind]
    const mid = s + w / 2
    s += w + pier.w
    return { chapter, kind, w, gap, mid, opening: kind !== 'niche' }
  })
  const anchor = placed.find((b) => b.kind === ANCHOR)?.mid ?? s / 2
  return placed.map(({ mid, ...b }) => ({ ...b, angle: (mid - anchor) / R }))
}

/** Angles of the piers: one before the first bay, one after each. */
export function pierAngles(bays: Bay[]): number[] {
  const { R, pier } = WALL
  if (bays.length === 0) return []
  const first = bays[0].angle - (bays[0].w / 2 + pier.w / 2) / R
  return [first, ...bays.map((b) => b.angle + (b.w / 2 + pier.w / 2) / R)]
}

/** A point at distance r from the arc's centre, at angle a (island-local). */
export function arcPoint(a: number, r: number): Vec2 {
  return { x: ARC_CENTRE.x + r * Math.cos(a), z: ARC_CENTRE.z + r * Math.sin(a) }
}

/**
 * The line a player crosses to discover a chapter: through `o`, across the direction `yaw`, within
 * `half` of `o`. For the wall, the middle of each opening, crossing outward.
 */
export type Threshold = { o: Vec2; yaw: number; half: number }
export function threshold(bay: Bay): Threshold {
  return { o: arcPoint(bay.angle, WALL.R + WALL.T / 2), yaw: bay.angle, half: bay.gap }
}

/** A wall segment as a box in island-local space: centre, half-length along the wall, half-depth, yaw. */
export type WallBox = { c: Vec2; hx: number; hz: number; yaw: number }

/** A bay-local span (x0..x1 along the wall, z0..z1 out of the back face) as an island-local box. */
function bayBox(angle: number, x0: number, x1: number, z0: number, z1: number): WallBox {
  const back = arcPoint(angle, WALL.R + WALL.T)
  const t = { x: -Math.sin(angle), z: Math.cos(angle) } // along the wall
  const n = { x: -Math.cos(angle), z: -Math.sin(angle) } // out of the back face, toward the arrival
  const mx = (x0 + x1) / 2
  const mz = (z0 + z1) / 2
  return { c: { x: back.x + t.x * mx + n.x * mz, z: back.z + t.z * mx + n.z * mz }, hx: (x1 - x0) / 2, hz: (z1 - z0) / 2, yaw: angle + Math.PI / 2 }
}

/** The wall's solid parts: each bay beside its opening (the whole bay for a niche), and the piers. */
export function wallSolids(bays: Bay[]): WallBox[] {
  const { T, pier } = WALL
  const out: WallBox[] = []
  for (const b of bays) {
    if (b.opening) out.push(bayBox(b.angle, -b.w / 2, -b.gap, 0, T), bayBox(b.angle, b.gap, b.w / 2, 0, T))
    else out.push(bayBox(b.angle, -b.w / 2, b.w / 2, 0, T))
  }
  for (const a of pierAngles(bays)) out.push(bayBox(a, -pier.w / 2, pier.w / 2, -0.07, T + 0.07))
  return out
}
