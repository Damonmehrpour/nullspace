// 2D geometry on the XZ ground plane (metres). Pure: no three.js.

export type Vec2 = { x: number; z: number }

export const v = {
  add: (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, z: a.z + b.z }),
  sub: (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, z: a.z - b.z }),
  scale: (a: Vec2, s: number): Vec2 => ({ x: a.x * s, z: a.z * s }),
  dot: (a: Vec2, b: Vec2): number => a.x * b.x + a.z * b.z,
  len: (a: Vec2): number => Math.hypot(a.x, a.z),
  dist: (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.z - b.z),
  lerp: (a: Vec2, b: Vec2, t: number): Vec2 => ({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t }),
  normalize: (a: Vec2): Vec2 => {
    const l = Math.hypot(a.x, a.z)
    return l === 0 ? { x: 0, z: 0 } : { x: a.x / l, z: a.z / l }
  },
  /** Angle in radians measured from +x towards +z. */
  angleOf: (a: Vec2): number => Math.atan2(a.z, a.x),
  fromAngle: (a: number): Vec2 => ({ x: Math.cos(a), z: Math.sin(a) }),
}

/** Parameter t ∈ [0,1] of the projection of p onto segment ab. */
function segmentT(p: Vec2, a: Vec2, b: Vec2): number {
  const ab = v.sub(b, a)
  const l2 = v.dot(ab, ab)
  return l2 === 0 ? 0 : Math.max(0, Math.min(1, v.dot(v.sub(p, a), ab) / l2))
}

export function closestPointOnSegment(p: Vec2, a: Vec2, b: Vec2): Vec2 {
  return v.lerp(a, b, segmentT(p, a, b))
}

export function distToSegment(p: Vec2, a: Vec2, b: Vec2): number {
  return v.dist(p, closestPointOnSegment(p, a, b))
}

export type Circle = { kind: 'circle'; c: Vec2; r: number }
/** A flat-ended rectangle along a→b with the given half-width. */
export type Strip = { kind: 'strip'; a: Vec2; b: Vec2; halfWidth: number }
export type Shape = Circle | Strip

/** Signed position of p in strip coordinates: along ∈ [0, length] inside, across ∈ [-hw, hw] inside. */
function stripLocal(s: Strip, p: Vec2): { along: number; across: number; length: number; dir: Vec2; normal: Vec2 } {
  const ab = v.sub(s.b, s.a)
  const length = v.len(ab)
  const dir = length === 0 ? { x: 1, z: 0 } : v.scale(ab, 1 / length)
  const normal = { x: -dir.z, z: dir.x }
  const ap = v.sub(p, s.a)
  return { along: v.dot(ap, dir), across: v.dot(ap, normal), length, dir, normal }
}

export function shapeContains(s: Shape, p: Vec2, eps = 1e-9): boolean {
  if (s.kind === 'circle') return v.dist(p, s.c) <= s.r + eps
  const l = stripLocal(s, p)
  return l.along >= -eps && l.along <= l.length + eps && Math.abs(l.across) <= s.halfWidth + eps
}

export function closestPointInShape(s: Shape, p: Vec2): Vec2 {
  if (shapeContains(s, p)) return p
  if (s.kind === 'circle') return v.add(s.c, v.scale(v.normalize(v.sub(p, s.c)), s.r))
  const l = stripLocal(s, p)
  const along = Math.max(0, Math.min(l.length, l.along))
  const across = Math.max(-s.halfWidth, Math.min(s.halfWidth, l.across))
  return v.add(s.a, v.add(v.scale(l.dir, along), v.scale(l.normal, across)))
}
