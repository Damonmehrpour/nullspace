import { describe, expect, it } from 'vitest'
import { islandSlabProfile, leafShape, visualVersion } from '../../src/world/v2/shapes'

describe('visual flag', () => {
  it('is v2 by default; only ?visual=v1 keeps the original look', () => {
    expect(visualVersion('')).toBe('v2')
    expect(visualVersion('?visual=v2')).toBe('v2')
    expect(visualVersion('?debug')).toBe('v2')
    expect(visualVersion('?visual=v3')).toBe('v2')
    expect(visualVersion('?visual=v1')).toBe('v1')
    expect(visualVersion('?debug&visual=v1')).toBe('v1')
  })
})

describe('floating island slab profile', () => {
  const r = 6
  const pts = islandSlabProfile(r, 6)

  it('has a flat walkable top at y = 0 out to the island radius', () => {
    const top = pts.filter((p) => Math.abs(p.y) < 1e-9)
    expect(Math.max(...top.map((p) => p.x))).toBeGreaterThanOrEqual(r - 0.2)
    expect(pts.every((p) => p.y <= 1e-9)).toBe(true)
    expect(Math.max(...pts.map((p) => p.x))).toBeLessThanOrEqual(r + 1e-9)
  })

  it('tapers to a point the requested depth below', () => {
    const bottom = pts.reduce((a, b) => (b.y < a.y ? b : a))
    expect(bottom.y).toBeCloseTo(-6)
    expect(bottom.x).toBe(0)
  })

  it('narrows monotonically on the way down (a hanging mass, not a cylinder)', () => {
    const under = pts.filter((p) => p.y < -0.7).sort((a, b) => b.y - a.y)
    for (let i = 1; i < under.length; i++) expect(under[i].x).toBeLessThanOrEqual(under[i - 1].x + 1e-9)
  })
})

describe('leaf shape', () => {
  it('is pointed at both ends, widest in the middle, and curls forward', () => {
    expect(leafShape(0).width).toBeCloseTo(0, 5)
    expect(leafShape(1).width).toBeCloseTo(0, 5)
    expect(leafShape(0.5).width).toBeGreaterThan(leafShape(0.15).width)
    expect(leafShape(1).curl).toBeGreaterThan(leafShape(0.5).curl)
  })
})
