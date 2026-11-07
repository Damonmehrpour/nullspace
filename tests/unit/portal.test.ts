import { beforeEach, describe, expect, it } from 'vitest'
import { WORLD } from '../../src/content/world'
import { v } from '../../src/core/geometry'
import { createWalkable } from '../../src/core/walkable'
import { initialState, isGameplayPaused, useStore } from '../../src/state/store'
import { worldColliders } from '../../src/world/v2/colliders'
import { PORTAL, portalInRange, portalPoint, portalSolids } from '../../src/world/v2/portalLayout'

const s = () => useStore.getState()
const walk = createWalkable(WORLD, worldColliders(WORLD))

beforeEach(() => {
  localStorage.clear()
  useStore.setState(initialState())
})

describe('portfolio portal', () => {
  it('faces the spawn and the bridge, and the spawn starts clear of it and within its reach', () => {
    expect(PORTAL.facing).toBeCloseTo(WORLD.spawn.facing)
    expect(walk.free(WORLD.spawn.pos)).toBe(true)
    expect(portalInRange(WORLD.spawn.pos)).toBe(true)
  })

  it('is solid: the rings, the sill and the pylons cannot be walked through', () => {
    expect(walk.free(WORLD.monolith.centre)).toBe(false)
    expect(walk.free(portalPoint(0, 1.5))).toBe(false) // across the aperture
    expect(walk.free(portalPoint(0, 3.4))).toBe(false) // a pylon
    expect(walk.free(portalPoint(-1.4, 0))).toBe(false) // the halo behind
  })

  it('can be walked around, and reached from its front, on the plinth', () => {
    const r = WORLD.monolith.plinthRadius
    // A ring of free floor around it, between the pylons' ends and the plinth's edge.
    for (let a = 0; a < 360; a += 5) {
      const p = { x: Math.cos((a * Math.PI) / 180) * (r - 0.7), z: Math.sin((a * Math.PI) / 180) * (r - 0.7) }
      expect(walk.free(p), `${a}°`).toBe(true)
    }
    // Its front step is within reach, and its body sits well inside the plinth.
    expect(walk.free(portalPoint(1.6, 0))).toBe(true)
    expect(portalInRange(portalPoint(1.6, 0))).toBe(true)
    for (const [x0, x1, z0, z1] of portalSolids())
      for (const [x, z] of [
        [x0, z0],
        [x1, z1],
        [x0, z1],
        [x1, z0],
      ])
        expect(v.len(portalPoint(x, z))).toBeLessThan(r - 1.2)
  })

  it('is out of reach from the bridge and the islands', () => {
    expect(portalInRange(v.lerp(WORLD.bridge.a, WORLD.bridge.b, 0.5))).toBe(false)
    for (const i of WORLD.islands) expect(portalInRange(i.arrivalPoint)).toBe(false)
  })

  it('enterPortal plays the transition, pausing the world, then switches to the Portfolio', () => {
    s().setPhase('world')
    s().updateSettings({ reducedMotion: 'off' })
    s().enterPortal()
    expect(s().portalTransit).toBe(true)
    expect(s().phase).toBe('world')
    expect(isGameplayPaused(s())).toBe(true)
    s().enterPortal() // a second press while it plays changes nothing
    s().finishPortal()
    expect(s().portalTransit).toBe(false)
    expect(s().phase).toBe('portfolio')
    expect(s().nearPortal).toBe(false)
  })

  it('with reduced motion, enterPortal switches straight to the Portfolio', () => {
    s().setPhase('world')
    s().updateSettings({ reducedMotion: 'on' })
    s().enterPortal()
    expect(s().portalTransit).toBe(false)
    expect(s().phase).toBe('portfolio')
  })

  it('does nothing outside the world', () => {
    s().setPhase('portfolio')
    s().enterPortal()
    expect(s().portalTransit).toBe(false)
    expect(s().phase).toBe('portfolio')
  })
})
