import { describe, expect, it } from 'vitest'
import { closestPointInShape, closestPointOnSegment, distToSegment, shapeContains, v, type Circle, type Strip } from '../../src/core/geometry'

const A = { x: 0, z: 0 }
const B = { x: 10, z: 0 }

describe('segments', () => {
  it('projects onto the interior', () => {
    expect(closestPointOnSegment({ x: 4, z: 3 }, A, B)).toEqual({ x: 4, z: 0 })
  })

  it('clamps to the endpoints', () => {
    expect(closestPointOnSegment({ x: -5, z: 1 }, A, B)).toEqual(A)
    expect(closestPointOnSegment({ x: 15, z: 1 }, A, B)).toEqual(B)
  })

  it('measures distance', () => {
    expect(distToSegment({ x: 4, z: 3 }, A, B)).toBe(3)
  })
})

describe('shapes', () => {
  const strip: Strip = { kind: 'strip', a: A, b: B, halfWidth: 1 }
  const circle: Circle = { kind: 'circle', c: { x: 0, z: 0 }, r: 2 }

  it('a strip contains points within its half-width but not beyond its ends', () => {
    expect(shapeContains(strip, { x: 5, z: 0.9 })).toBe(true)
    expect(shapeContains(strip, { x: 5, z: 1.1 })).toBe(false)
    expect(shapeContains(strip, { x: 10.5, z: 0 })).toBe(false)
    expect(shapeContains(strip, { x: -0.5, z: 0 })).toBe(false)
  })

  it('the closest point in a circle is on its boundary for an outside point', () => {
    const p = closestPointInShape(circle, { x: 5, z: 0 })
    expect(p.x).toBeCloseTo(2)
    expect(p.z).toBeCloseTo(0)
  })

  it('the closest point in a strip clamps both across and along', () => {
    const p = closestPointInShape(strip, { x: 12, z: 3 })
    expect(p.x).toBeCloseTo(10)
    expect(p.z).toBeCloseTo(1)
  })

  it('points inside are returned unchanged', () => {
    expect(closestPointInShape(circle, { x: 1, z: 1 })).toEqual({ x: 1, z: 1 })
  })
})

describe('vector helpers', () => {
  it('angleOf and fromAngle round-trip', () => {
    const d = v.fromAngle(Math.PI / 3)
    expect(v.angleOf(d)).toBeCloseTo(Math.PI / 3)
    expect(v.len(d)).toBeCloseTo(1)
  })

  it('normalize leaves the zero vector at zero', () => {
    expect(v.normalize({ x: 0, z: 0 })).toEqual({ x: 0, z: 0 })
  })
})
