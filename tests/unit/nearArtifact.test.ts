import { beforeEach, describe, expect, it } from 'vitest'
import { WORLD } from '../../src/content/world'
import { v } from '../../src/core/geometry'
import { initialState, useStore } from '../../src/state/store'
import { resetSim, simulate, teleportPlayer } from '../../src/world/sim'

const slots = WORLD.islands.find((i) => i.id === 'projects')!.artifactSlots

beforeEach(() => {
  useStore.setState({ ...initialState(), phase: 'world', revealPlayed: new Set(['projects']) })
  resetSim()
})

describe('near-artifact prompt state', () => {
  it('reports the artifact the player is next to', () => {
    teleportPlayer(v.add(slots[1], { x: 0.4, z: 0 }))
    simulate(1 / 60)
    expect(useStore.getState().nearArtifact).toBe(1)
  })

  it('clears when the player walks away', () => {
    teleportPlayer(v.add(slots[1], { x: 0.4, z: 0 }))
    simulate(1 / 60)
    teleportPlayer(WORLD.spawn.pos)
    simulate(1 / 60)
    expect(useStore.getState().nearArtifact).toBeNull()
  })

  it('is hidden while a panel is open', () => {
    teleportPlayer(v.add(slots[0], { x: 0.4, z: 0 }))
    useStore.getState().openSection('skills', { source: 'quicknav' })
    simulate(1 / 60)
    expect(useStore.getState().nearArtifact).toBeNull()
  })
})
