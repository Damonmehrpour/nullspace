import { SPREAD } from '../../content/world'
import type { Vec2 } from '../../core/geometry'
import type { PortalStyle } from './experienceChapters'

// The Experience island's layout, shared by its meshes (ExperienceV2), its colliders and its tests.
// Island-local space: +x points outward along the corridor, z across it.

export type Spec = { x: number; H: number; W: number; jw: number; D: number }
/** The corridor gates, oldest nearest the arrival ring, the tallest (ARVO) framing the void. */
export type CorridorStyle = Exclude<PortalStyle, 'generic' | 'sammi'>
// Positions along the corridor follow the island's size (SPREAD), so the gates stand further apart.
export const SPECS: Record<CorridorStyle, Spec> = {
  medrick: { x: -0.7 * SPREAD, H: 3.6, W: 1.8, jw: 0.6, D: 0.7 },
  ubicomp: { x: 1.15 * SPREAD, H: 4.1, W: 2.0, jw: 0.62, D: 0.6 },
  oasis: { x: 3.0 * SPREAD, H: 4.6, W: 2.9, jw: 0.35, D: 0.8 },
  arvo: { x: 4.95 * SPREAD, H: 4.8, W: 2.3, jw: 0.7, D: 0.75 },
}
export const LINTEL = 0.75
/** ARVO's details: fin width and gap beside each pier, the mast above the lintel, the cantilever, and the inner frame. */
export const ARVO = { fin: 0.16, gap: 0.08, mast: 0.9, cantilever: 1.3, inset: 0.45, frameIn: 0.22 }
/** The inner frame's posts (island-local x and |z|), for the colliders. */
export function arvoPosts(): { x: number; z: number } {
  const s = SPECS.arvo
  return { x: s.x + s.D / 2 + ARVO.inset, z: s.W / 2 - ARVO.frameIn }
}
export const STELE = { x: 0.22 * SPREAD, z: 1.85 }

const deg = (d: number) => (d * Math.PI) / 180

/**
 * Sämmi Studios: a small indie workshop standing on its own beside the corridor, its front turned
 * toward the arrival ring and the corridor so its sign reads from where the player stands.
 * Studio-local space: u points out of the front (the sign and door), v runs across the front, y up.
 */
export const STUDIO = {
  /** Footprint centre (island-local) and the direction its front faces (island-local angle). */
  x: 0.6 * SPREAD,
  z: -4.0 * SPREAD,
  facing: deg(106),
  /** The workshop hall under its sawtooth roof (+v is the viewer's left, away from the corridor). */
  hall: { u0: -0.95, u1: 0.75, v0: -0.6, v1: 1.7, h: 3.0 },
  /** The loft tower on the corridor side, its roof pitched up toward the front. */
  loft: { u0: -0.95, u1: 0.2, v0: -1.45, v1: -0.6, back: 4.25, front: 4.75, slit: -1.3, glider: -0.9 },
  /** The entrance: an open doorway recessed into the hall's front. */
  door: { v0: -0.35, v1: 0.65, h: 2.05, depth: 0.5 },
  window: { v0: 0.95, v1: 1.5, y0: 0.85, y1: 2.0 },
  sign: { v0: -0.52, v1: 1.62, y0: 2.3, y1: 2.94 },
  /** The low plinth margin around the walls (not across the doorway). */
  plinth: 0.08,
  /** Two crates on the terrace in front of the loft. */
  crates: [
    { u: 0.47, v: -1.05, s: 0.42, h: 0.42, yaw: deg(8) },
    { u: 0.5, v: -1.0, s: 0.3, h: 0.28, yaw: deg(-14), y: 0.42 },
  ],
}

/** The studio's full width across its front (hall and loft together), as [min v, max v]. */
export function studioSpan(): [number, number] {
  return [Math.min(STUDIO.hall.v0, STUDIO.loft.v0), Math.max(STUDIO.hall.v1, STUDIO.loft.v1)]
}

/** A studio-local point (u, v) in island-local space. */
export function studioPoint(u: number, v: number): Vec2 {
  const c = Math.cos(STUDIO.facing)
  const s = Math.sin(STUDIO.facing)
  return { x: STUDIO.x + u * c - v * s, z: STUDIO.z + u * s + v * c }
}

/** An island-local point in studio-local (u, v). */
export function toStudio(p: Vec2): { u: number; v: number } {
  const c = Math.cos(STUDIO.facing)
  const s = Math.sin(STUDIO.facing)
  const dx = p.x - STUDIO.x
  const dz = p.z - STUDIO.z
  return { u: dx * c + dz * s, v: -dx * s + dz * c }
}

/**
 * The line a player crosses to discover a chapter: through `o`, across the direction `yaw`, within
 * `half` of `o`. A corridor gate's opening, or the studio's doorway.
 */
export type Threshold = { o: Vec2; yaw: number; half: number }
export function threshold(style: Exclude<PortalStyle, 'generic'>): Threshold {
  if (style === 'sammi') {
    const { door, hall } = STUDIO
    return { o: studioPoint(hall.u1, (door.v0 + door.v1) / 2), yaw: STUDIO.facing, half: (door.v1 - door.v0) / 2 }
  }
  const s = SPECS[style]
  return { o: { x: s.x, z: 0 }, yaw: 0, half: s.W / 2 }
}
