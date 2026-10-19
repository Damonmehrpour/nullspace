import { beforeEach, describe, expect, it } from 'vitest'
import { WORLD } from '../../src/content/world'
import type { InputState } from '../../src/core/input'
import { createQuality, onDecline, onIncline } from '../../src/core/quality'
import { initialState, isGameplayPaused, useStore } from '../../src/state/store'
import { resetSim, sim, simulate, teleportPlayer } from '../../src/world/sim'

const s = () => useStore.getState()
const input: InputState = { up: false, down: false, left: false, right: false, interact: false }

beforeEach(() => {
  useStore.setState({ ...initialState(), phase: 'world', tourTarget: 'education' })
  resetSim()
  input.up = false
  sim.input = { state: input, clear: () => (input.up = false), dispose: () => {} }
})

describe('I1: an open Settings dialog pauses the world', () => {
  it('counts as paused', () => {
    s().setOverlay('settings')
    expect(isGameplayPaused(s())).toBe(true)
  })

  it('a held movement key does not move the player while Settings is open', () => {
    s().setOverlay('settings')
    const before = sim.player.pos
    input.up = true
    for (let i = 0; i < 30; i++) simulate(1 / 60)
    expect(sim.player.pos).toEqual(before)
  })

  it('arrivals and reveals wait while Settings is open', () => {
    s().setOverlay('settings')
    s().arrive('education')
    expect(s().revealing).toBeNull()
    s().setOverlay(null)
    s().arrive('education')
    s().setOverlay('settings')
    s().tickReveal(5)
    expect(s().panel).toBeNull()
  })
})

describe('M1: leaving the world clears in-flight world state', () => {
  it('a reveal running when the world is left never opens a panel later', () => {
    s().arrive('education')
    s().leaveWorld()
    expect(s().revealing).toBeNull()
    expect(s().teleportRequest).toBeNull()
    s().tickReveal(5)
    expect(s().panel).toBeNull()
    expect(s().revealPlayed.has('education')).toBe(true)
  })
})

describe('M6: touch "Guide me there" brings the guide along', () => {
  it('the guide is waiting at the island, not stranded far behind', () => {
    s().guideMeThere('contact', true)
    simulate(1 / 60)
    const contact = WORLD.islands.find((i) => i.id === 'contact')!
    expect(Math.hypot(sim.guide.pos.x - contact.arrivalPoint.x, sim.guide.pos.z - contact.arrivalPoint.z)).toBeLessThan(3)
    expect(sim.guide.name).not.toBe('wait')
    void teleportPlayer
  })
})

describe('M7: adaptive quality stops flip-flopping', () => {
  it('locks to Low after three down/up cycles', () => {
    let q = createQuality('high')
    // Three steps down from High (pixel ratio, Medium, Low) and three back up, three times.
    for (let i = 0; i < 3; i++) q = onIncline(onIncline(onIncline(onDecline(onDecline(onDecline(q))))))
    q = onDecline(onDecline(onDecline(q)))
    expect(q.effective).toBe('low')
    expect(onIncline(onIncline(onIncline(q))).effective).toBe('low')
  })
})
