import { beforeEach, describe, expect, it } from 'vitest'
import { WORLD } from '../../src/content/world'
import { artifactInRange } from '../../src/core/arrival'
import { v } from '../../src/core/geometry'
import type { InputState } from '../../src/core/input'
import { initialState, useStore } from '../../src/state/store'
import { resetSim, sim, simulate, teleportPlayer } from '../../src/world/sim'

const projects = WORLD.islands.find((i) => i.id === 'projects')!
const slots = projects.artifactSlots

describe('artifactInRange', () => {
  it('returns the nearest slot within 1.5 m', () => {
    expect(artifactInRange(v.add(slots[1], { x: 0.5, z: 0 }), slots)).toBe(1)
  })

  it('returns null beyond range', () => {
    expect(artifactInRange(projects.arrivalPoint, slots)).toBeNull()
  })
})

describe('artifact interaction in the simulation', () => {
  const state: InputState = { up: false, down: false, left: false, right: false, interact: false }

  beforeEach(() => {
    useStore.setState({ ...initialState(), phase: 'world', revealPlayed: new Set(['projects']) })
    resetSim()
    state.interact = false
    sim.input = { state, clear: () => (state.interact = false), dispose: () => {} }
  })

  it('E or Enter next to an artifact opens that project', () => {
    teleportPlayer(v.add(slots[0], { x: 0.3, z: 0 }))
    simulate(1 / 60)
    state.interact = true
    simulate(1 / 60)
    expect(useStore.getState().panel).toEqual({ kind: 'project', id: 'project-01' })
  })

  it('a held key opens only once (edge-triggered)', () => {
    teleportPlayer(v.add(slots[2], { x: 0.3, z: 0 }))
    state.interact = true
    simulate(1 / 60)
    expect(useStore.getState().panel).toEqual({ kind: 'project', id: 'project-03' })
    useStore.getState().closePanel()
    state.interact = true
    simulate(1 / 60)
    expect(useStore.getState().panel).toBeNull()
  })

  it('does nothing out of range', () => {
    teleportPlayer(WORLD.spawn.pos)
    state.interact = true
    simulate(1 / 60)
    expect(useStore.getState().panel).toBeNull()
  })
})
