import { WORLD } from '../../content/world'
import { v, type Vec2 } from '../../core/geometry'

// The portfolio portal on the central plinth, where the monolith stood: a gateway from the 3D world to
// the 2D Portfolio. Shared by its meshes (PortalV2), its colliders and the simulation's prompt.
// Portal-local space: +x is the front (toward the spawn and the bridge), z runs across the aperture, y up.

export const PORTAL = {
  /** The direction the front faces (world angle): the spawn and the bridge to the ring. */
  facing: WORLD.spawn.facing,
  /** Aperture centre height; the main ring's bottom is sunk into the plinth, leaving a raised sill. */
  cy: 2.55,
  /** The main twelve-sided ring. */
  ring: { rIn: 2.2, rOut: 2.95, depth: 0.9 },
  /** A thinner outer ring set back behind it, turned half a facet. */
  halo: { rIn: 3.2, rOut: 3.42, depth: 0.22, back: 0.62 },
  /** Angular pylons buttressing each side, and the arms tying them to the ring. */
  pylon: { z0: 3.05, z1: 3.75, x0: -1.4, x1: 1.0, h: 3.5, top: 0.5 },
  /** The sill across the aperture's foot. */
  sill: { h: 0.32, d: 1.1 },
  sides: 12,
  /** How close (from the portal's centre) the player must be for the prompt and the E key. */
  range: 2.6,
}

/** The aperture's facet angles: a flat edge at the bottom and the top. */
export function facet(k: number): number {
  return ((k + 0.5) * 2 * Math.PI) / PORTAL.sides
}

/** A portal-local point (x front, z across) in world space. */
export function portalPoint(x: number, z: number): Vec2 {
  const c = Math.cos(PORTAL.facing)
  const s = Math.sin(PORTAL.facing)
  return { x: WORLD.monolith.centre.x + x * c - z * s, z: WORLD.monolith.centre.z + x * s + z * c }
}

/** Whether a world position is close enough to the portal to use it. */
export function portalInRange(p: Vec2): boolean {
  return v.dist(p, WORLD.monolith.centre) < PORTAL.range
}

/** The portal's solid parts as portal-local boxes [x0, x1, z0, z1] (rings with their sill, and the pylons). */
export function portalSolids(): [number, number, number, number][] {
  const { ring, halo, pylon } = PORTAL
  const back = -ring.depth / 2 - halo.back - halo.depth
  return [
    [back, ring.depth / 2 + 0.4, -ring.rOut, ring.rOut], // to the front of the step
    [pylon.x0, pylon.x1, -pylon.z1, -pylon.z0 + 0.1],
    [pylon.x0, pylon.x1, pylon.z0 - 0.1, pylon.z1],
  ]
}
