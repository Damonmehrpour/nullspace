// The Education & Research island's academy: a small observatory-university on a stepped podium,
// shared by its meshes (EducationV2) and its collider. Island-local space: +x points outward (the
// entrance faces the arrival ring at -x), z runs across, y is up.

export const ACADEMY = {
  /** The podium: three steps up from x0, then the platform everything stands on, to x1. */
  podium: { x0: 0.5, x1: 4.95, z: 2.55, steps: 3, rise: 0.12, run: 0.24 },
  /** The portico's six columns, the centre bay as wide as the arched doorway behind it. */
  columns: { x: 1.62, r: 0.16, z: [-2.25, -1.4, -0.55, 0.55, 1.4, 2.25], top: 2.95 },
  /** The hall behind the portico: an arched front wall and the block behind it. */
  hall: { x0: 2.2, front: 0.25, x1: 4.75, z: 2.3, h: 3.0 },
  arch: { half: 0.55, spring: 1.75 },
  /** The flat roof over portico and hall, with the pediment over the portico's front. */
  roof: { x0: 1.35, x1: 4.9, z: 2.5, y0: 2.95, y1: 3.25 },
  pediment: { x0: 1.35, depth: 0.42, apex: 3.85 },
  /** The observatory: a drum and dome on the roof, a slit turned toward the arrival ring and a telescope through it
 * (turned `az` off the axis so its silhouette reads from the ring instead of pointing straight at the camera). */
  dome: { x: 3.8, r: 1.0, drum: 0.45, slitFrom: 0.12, slitTo: 1.45, scope: Math.PI / 4, az: (-32 * Math.PI) / 180 },
  /** Book-spine stacks standing against the hall's side walls (they slide out on reveal). */
  stacks: { z0: 2.3, z1: 2.55, x: [2.6, 3.2, 3.8, 4.4], h: [1.55, 2.05, 1.35, 1.8], w: 0.46 },
}

/** The platform's top height. */
export const PODIUM_TOP = ACADEMY.podium.steps * ACADEMY.podium.rise
