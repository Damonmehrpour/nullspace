import { describe, expect, it } from 'vitest'
import { WORLD } from '../../src/content/world'
import { WALK } from '../../src/core/config'
import { distToSegment, v, type Circle } from '../../src/core/geometry'
import { createWalkable, createWalkableFromShapes } from '../../src/core/walkable'

const walk = createWalkable(WORLD)
const island = (id: string) => WORLD.islands.find((i) => i.id === id)!
const walkway = WORLD.walkways[0]
const mid = v.lerp(walkway.a, walkway.b, 0.5)
const along = v.normalize(v.sub(walkway.b, walkway.a))
const side = { x: -along.z, z: along.x }

describe('contains', () => {
  it('includes island centres, walkways, the bridge and the plinth', () => {
    expect(walk.contains(island('education').centre)).toBe(true)
    expect(walk.contains(mid)).toBe(true)
    expect(walk.contains(v.lerp(WORLD.bridge.a, WORLD.bridge.b, 0.5))).toBe(true)
    expect(walk.contains({ x: 0, z: 0 })).toBe(true)
  })

  it('excludes the void outside the ring and between monolith and islands', () => {
    expect(walk.contains(v.scale(island('education').centre, 25 / 22 + 0.2))).toBe(false)
    expect(walk.contains({ x: 0, z: 10 })).toBe(false)
  })
})

describe('clamp', () => {
  it('leaves interior points unchanged', () => {
    const p = v.add(mid, v.scale(along, 0.3))
    expect(walk.clamp(mid, p)).toEqual(p)
  })

  it('slides along a walkway edge instead of stopping', () => {
    const next = v.add(mid, v.add(v.scale(side, 2), v.scale(along, 0.5)))
    const out = walk.clamp(mid, next)
    expect(walk.contains(out)).toBe(true)
    expect(v.dot(v.sub(out, mid), along)).toBeCloseTo(0.5, 5)
    expect(Math.abs(distToSegment(out, walkway.a, walkway.b) - walkway.halfWidth)).toBeLessThan(0.01)
  })

  it('never leaves the walkable area at a walkway–island join', () => {
    const corner = v.add(walkway.a, v.scale(side, walkway.halfWidth + 0.4))
    expect(walk.contains(walk.clamp(walkway.a, corner))).toBe(true)
  })

  it('handles an absurd delta from the plinth centre', () => {
    expect(walk.contains(walk.clamp({ x: 0, z: 0 }, { x: 50, z: 0 }))).toBe(true)
  })
})

describe('sweep (no gap crossing)', () => {
  it('cannot jump between two shapes separated by a void gap', () => {
    const a: Circle = { kind: 'circle', c: { x: 0, z: 0 }, r: 2 }
    const b: Circle = { kind: 'circle', c: { x: 5, z: 0 }, r: 2 }
    const w = createWalkableFromShapes([a, b])
    expect(w.contains({ x: 5, z: 0 })).toBe(true)
    const out = w.sweep({ x: 0, z: 0 }, { x: 5, z: 0 })
    expect(out.x).toBeLessThanOrEqual(2 + 1e-6)
  })

  it('stays on the bridge when pushed sideways into the void', () => {
    const bMid = v.lerp(WORLD.bridge.a, WORLD.bridge.b, 0.5)
    const dir = v.normalize(v.sub(WORLD.bridge.b, WORLD.bridge.a))
    const out = walk.sweep(bMid, v.add(bMid, v.scale({ x: -dir.z, z: dir.x }, 3)))
    expect(distToSegment(out, WORLD.bridge.a, WORLD.bridge.b)).toBeLessThanOrEqual(WORLD.bridge.halfWidth + 0.001)
  })

  it('cannot leave the plinth straight towards an island across the void', () => {
    const edu = island('education')
    const start = v.scale(v.normalize(edu.centre), 4.9)
    const out = walk.sweep(start, edu.centre)
    expect(v.len(out)).toBeLessThanOrEqual(WORLD.monolith.plinthRadius + 0.001)
  })

  it('gives the same result for one large delta as for many small ones', () => {
    const edu = island('education')
    const start = v.scale(v.normalize(edu.centre), 4.9)
    let p = start
    for (let i = 0; i < 100; i++) p = walk.sweep(p, v.add(p, v.scale(v.normalize(v.sub(edu.centre, start)), 0.1)))
    const big = walk.sweep(start, v.add(start, v.scale(v.normalize(v.sub(edu.centre, start)), 10)))
    expect(v.dist(p, big)).toBeLessThan(0.05)
  })

  it('reaches the far end of a walkway on a legitimate walk', () => {
    expect(v.dist(walk.sweep(walkway.a, walkway.b), walkway.b)).toBeLessThan(0.01)
  })

  it('uses substeps no larger than the configured maximum', () => {
    expect(WALK.maxSubstep).toBeLessThan(Math.min(walkway.halfWidth, WORLD.bridge.halfWidth))
  })
})
