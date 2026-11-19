import { beforeEach, describe, expect, it } from 'vitest'
import { WORLD } from '../../src/content/world'
import { v } from '../../src/core/geometry'
import { initialState, useStore } from '../../src/state/store'
import { resetSim, sim, simulate } from '../../src/world/sim'

// Touch "Guide me there" moves the player straight to an island's arrival ring. The player and the
// camera then face the island (outward from the monolith), as if they had walked in, instead of keeping
// whatever way they faced before (which left the camera looking back up the walkway).

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))

describe('Guide me there arrival (touch)', () => {
  beforeEach(() => {
    useStore.setState({ ...initialState(), phase: 'world' })
    resetSim()
  })

  for (const island of WORLD.islands) {
    it(`faces ${island.id} on arrival`, () => {
      useStore.getState().guideMeThere(island.id, true)
      simulate(1 / 60)
      const outward = v.angleOf(island.centre)
      expect(v.dist(sim.player.pos, island.arrivalPoint)).toBeLessThan(1e-6)
      expect(Math.abs(wrap(sim.player.facing - outward))).toBeLessThan(1e-6)
      expect(Math.abs(wrap(sim.rig.yaw - outward))).toBeLessThan(0.05)
    })
  }

  it('leaves desktop guidance alone (no teleport, no turn)', () => {
    const before = { ...sim.player }
    useStore.getState().guideMeThere('experience', false)
    simulate(1 / 60)
    expect(sim.player.facing).toBeCloseTo(before.facing)
  })
})
