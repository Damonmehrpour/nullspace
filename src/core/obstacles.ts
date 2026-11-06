// Solid obstacles on the ground plane: what the player can't walk through. Pure 2D (no three.js):
// rotated boxes, round pillars and ring-wall sectors are enough to match the world's silhouettes at
// walking height. The player is a circle of radius `r`; a penetrating body is pushed out along the
// nearest surface's normal, which keeps the tangential part of the move: sliding, not freezing.

import { closestPointOnSegment, v, type Vec2 } from './geometry'

export type Obstacle =
  /** A box with half-extents hx (along its own x) and hz, its x axis at angle `yaw` (from +x toward +z). */
  | { kind: 'box'; c: Vec2; hx: number; hz: number; yaw: number }
  | { kind: 'circle'; c: Vec2; r: number }
  /** A sector of a ring between radii r0 and r1, from angle a0 to a1 (counter-clockwise, a1 > a0). */
  | { kind: 'arc'; c: Vec2; r0: number; r1: number; a0: number; a1: number }

const TAU = Math.PI * 2

function bound(o: Obstacle): number {
  return o.kind === 'box' ? Math.hypot(o.hx, o.hz) : o.kind === 'circle' ? o.r : o.r1
}

/** The nearest point on the obstacle's outline to p, and whether p is inside it. */
function nearestBoundary(o: Obstacle, p: Vec2): { b: Vec2; inside: boolean } {
  const d = v.sub(p, o.c)
  if (o.kind === 'circle') {
    const l = v.len(d)
    const dir = l > 1e-9 ? v.scale(d, 1 / l) : { x: 1, z: 0 }
    return { b: v.add(o.c, v.scale(dir, o.r)), inside: l < o.r }
  }
  if (o.kind === 'box') {
    const ax = v.fromAngle(o.yaw)
    const az = { x: -ax.z, z: ax.x }
    const u = v.dot(d, ax)
    const w = v.dot(d, az)
    const toWorld = (lu: number, lw: number) => v.add(o.c, v.add(v.scale(ax, lu), v.scale(az, lw)))
    if (Math.abs(u) <= o.hx && Math.abs(w) <= o.hz) {
      // Inside: out through the nearest face.
      return o.hx - Math.abs(u) < o.hz - Math.abs(w) ? { b: toWorld(Math.sign(u || 1) * o.hx, w), inside: true } : { b: toWorld(u, Math.sign(w || 1) * o.hz), inside: true }
    }
    return { b: toWorld(Math.max(-o.hx, Math.min(o.hx, u)), Math.max(-o.hz, Math.min(o.hz, w))), inside: false }
  }
  const rho = v.len(d)
  const phi = Math.atan2(d.z, d.x)
  const t = (((phi - o.a0) % TAU) + TAU) % TAU
  const inRange = t <= o.a1 - o.a0
  const candidates: Vec2[] = []
  for (const a of [o.a0, o.a1]) {
    const dir = v.fromAngle(a)
    candidates.push(closestPointOnSegment(p, v.add(o.c, v.scale(dir, o.r0)), v.add(o.c, v.scale(dir, o.r1))))
  }
  if (inRange) {
    const dir = rho > 1e-9 ? v.scale(d, 1 / rho) : v.fromAngle(o.a0)
    candidates.push(v.add(o.c, v.scale(dir, o.r0)), v.add(o.c, v.scale(dir, o.r1)))
  }
  let b = candidates[0]
  for (const c of candidates) if (v.dist(c, p) < v.dist(b, p)) b = c
  return { b, inside: inRange && rho >= o.r0 && rho <= o.r1 }
}

const near = (o: Obstacle, p: Vec2, r: number) => v.dist(p, o.c) <= bound(o) + r

/** True when a body of radius r at p overlaps any obstacle. */
export function blocked(p: Vec2, obstacles: Obstacle[], r: number): boolean {
  for (const o of obstacles) {
    if (!near(o, p, r)) continue
    const { b, inside } = nearestBoundary(o, p)
    if (inside || v.dist(p, b) < r - 1e-6) return true
  }
  return false
}

/** Pushes a body of radius r at p out of every obstacle it overlaps (a few passes for corners). */
export function resolveObstacles(p: Vec2, obstacles: Obstacle[], r: number): Vec2 {
  let q = p
  for (let pass = 0; pass < 4; pass++) {
    let moved = false
    for (const o of obstacles) {
      if (!near(o, q, r)) continue
      const { b, inside } = nearestBoundary(o, q)
      const dist = v.dist(q, b)
      if (dist < 1e-9) continue
      if (inside) q = v.add(b, v.scale(v.sub(b, q), r / dist))
      else if (dist < r - 1e-6) q = v.add(b, v.scale(v.sub(q, b), r / dist))
      else continue
      moved = true
    }
    if (!moved) break
  }
  return q
}
