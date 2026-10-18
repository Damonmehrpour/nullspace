import type { WorldLayout } from '../content/world'
import { WALK } from './config'
import { closestPointInShape, shapeContains, v, type Shape, type Vec2 } from './geometry'

export type Walkable = {
  shapes: Shape[]
  contains(p: Vec2): boolean
  /** One local correction: keeps `next` walkable without jumping to a shape `prev` isn't on. */
  clamp(prev: Vec2, next: Vec2): Vec2
  /** The only movement entry point: substeps from→to so no unwalkable gap can be crossed. */
  sweep(from: Vec2, to: Vec2): Vec2
}

const ON_SHAPE_EPS = 1e-6

export function createWalkableFromShapes(shapes: Shape[]): Walkable {
  const contains = (p: Vec2) => shapes.some((s) => shapeContains(s, p))

  function clamp(prev: Vec2, next: Vec2): Vec2 {
    if (contains(next)) return next
    const home = shapes.filter((s) => shapeContains(s, prev, ON_SHAPE_EPS))
    const candidates = (home.length > 0 ? home : shapes).map((s) => closestPointInShape(s, next))
    let best: Vec2 | null = null
    let bestD = Infinity
    for (const c of candidates) {
      const d = v.dist(c, next)
      if (d < bestD) {
        best = c
        bestD = d
      }
    }
    return best ?? prev
  }

  function sweep(from: Vec2, to: Vec2): Vec2 {
    const delta = v.sub(to, from)
    const n = Math.ceil(v.len(delta) / WALK.maxSubstep)
    if (n === 0) return from
    const step = v.scale(delta, 1 / n)
    let p = from
    for (let i = 0; i < n; i++) p = clamp(p, v.add(p, step))
    return p
  }

  return { shapes, contains, clamp, sweep }
}

export function walkableShapes(layout: WorldLayout): Shape[] {
  return [
    { kind: 'circle', c: layout.monolith.centre, r: layout.monolith.plinthRadius },
    ...layout.islands.map((i): Shape => ({ kind: 'circle', c: i.centre, r: i.radius })),
    ...layout.walkways.map((w): Shape => ({ kind: 'strip', a: w.a, b: w.b, halfWidth: w.halfWidth })),
    { kind: 'strip', a: layout.bridge.a, b: layout.bridge.b, halfWidth: layout.bridge.halfWidth },
  ]
}

export function createWalkable(layout: WorldLayout): Walkable {
  return createWalkableFromShapes(walkableShapes(layout))
}
