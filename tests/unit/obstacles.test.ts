import { describe, expect, it } from 'vitest'
import { v } from '../../src/core/geometry'
import { blocked, resolveObstacles, type Obstacle } from '../../src/core/obstacles'
import { createWalkableFromShapes } from '../../src/core/walkable'

const R = 0.3
const box: Obstacle = { kind: 'box', c: { x: 0, z: 0 }, hx: 1, hz: 0.5, yaw: 0 }
const pillar: Obstacle = { kind: 'circle', c: { x: 0, z: 0 }, r: 0.5 }
// A quarter of a ring wall, from 0° to 90°, between radii 4 and 5.
const arc: Obstacle = { kind: 'arc', c: { x: 0, z: 0 }, r0: 4, r1: 5, a0: 0, a1: Math.PI / 2 }

describe('obstacles', () => {
  it('blocks a body that overlaps a box, a pillar or a ring wall, and nothing else', () => {
    expect(blocked({ x: 1.2, z: 0 }, [box], R)).toBe(true)
    expect(blocked({ x: 1.31, z: 0 }, [box], R)).toBe(false)
    expect(blocked({ x: 0, z: 0.75 }, [pillar], R)).toBe(true)
    expect(blocked({ x: 0, z: 0.85 }, [pillar], R)).toBe(false)
    expect(blocked({ x: 3.2, z: 3.2 }, [arc], R)).toBe(true) // r ≈ 4.53, inside the wall
    expect(blocked({ x: 3.4, z: -0.5 }, [arc], R)).toBe(false) // just past the 0° end
    expect(blocked({ x: 2.5, z: 2.5 }, [arc], R)).toBe(false) // inside the ring, clear of the wall
  })

  it('a rotated box blocks along its own axes', () => {
    const turned: Obstacle = { ...box, yaw: Math.PI / 2 } // long axis now along z
    expect(blocked({ x: 0, z: 1.2 }, [turned], R)).toBe(true)
    expect(blocked({ x: 1.2, z: 0 }, [turned], R)).toBe(false)
  })

  it('pushes a penetrating body out along the surface normal, so it slides', () => {
    const p = resolveObstacles({ x: 0.4, z: 0.7 }, [box], R)
    expect(p.x).toBeCloseTo(0.4) // the tangential part survives: sliding, not freezing
    expect(p.z).toBeCloseTo(0.8)
    expect(blocked(p, [box], R)).toBe(false)
  })
})

describe('walking with obstacles', () => {
  const floor = createWalkableFromShapes([{ kind: 'circle', c: { x: 0, z: 0 }, r: 20 }], [box, { kind: 'circle', c: { x: 6, z: 0 }, r: 0.4 }], R)

  it('never ends a sweep inside an obstacle, even at a huge frame step', () => {
    const end = floor.sweep({ x: -4, z: 0 }, { x: 4, z: 0 })
    expect(blocked(end, floor.obstacles, R)).toBe(false)
    expect(end.x).toBeLessThan(-1.29) // stopped at the box's near face, not tunnelled through
  })

  it('slides along a wall when walking into it at an angle', () => {
    const end = floor.sweep({ x: -2, z: 0.2 }, { x: 0, z: 2.2 })
    expect(end.z).toBeGreaterThan(1.5) // kept moving along the face
    expect(blocked(end, floor.obstacles, R)).toBe(false)
  })

  it('keeps everything between obstacles free (free = walkable and unblocked)', () => {
    expect(floor.free({ x: 3, z: 0 })).toBe(true)
    expect(floor.free({ x: 0, z: 0 })).toBe(false)
    expect(floor.free({ x: 30, z: 0 })).toBe(false)
  })

  it('a step that would end inside a tight spot stays where it was (never trapped)', () => {
    const narrow = createWalkableFromShapes(
      [{ kind: 'circle', c: { x: 0, z: 0 }, r: 20 }],
      [
        { kind: 'box', c: { x: 0, z: 0.45 }, hx: 1, hz: 0.2, yaw: 0 },
        { kind: 'box', c: { x: 0, z: -0.45 }, hx: 1, hz: 0.2, yaw: 0 },
      ],
      R,
    )
    const from = { x: -2, z: 0 }
    const end = narrow.sweep(from, { x: 2, z: 0 })
    expect(narrow.free(end)).toBe(true)
    expect(v.dist(end, from)).toBeLessThan(1) // a 0.5 m gap is too narrow for a 0.6 m body: it stops at the mouth
  })
})
