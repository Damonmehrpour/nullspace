import { beforeEach, describe, expect, it } from 'vitest'
import { WORLD } from '../../src/content/world'
import { revealDurationMs } from '../../src/core/arrival'
import { initialState, useStore } from '../../src/state/store'

const s = () => useStore.getState()

beforeEach(() => {
  useStore.setState({ ...initialState(), phase: 'world', tourTarget: 'education' })
})

describe('revealDurationMs', () => {
  it('is 2 s on a first visit, 0.3 s with reduced motion and 0 on a revisit', () => {
    expect(revealDurationMs('education', new Set(), false)).toBe(2000)
    expect(revealDurationMs('education', new Set(), true)).toBe(300)
    expect(revealDurationMs('education', new Set(['education']), false)).toBe(0)
  })
})

describe('store arrival flow', () => {
  it('a first arrival marks the world visit, reveals, then opens the panel and marks it viewed', () => {
    s().arrive('education')
    expect(s().worldVisited.has('education')).toBe(true)
    expect(s().revealing).toBe('education')
    expect(s().panel).toBeNull()
    s().tickReveal(1.9)
    expect(s().panel).toBeNull()
    s().tickReveal(0.2)
    expect(s().revealing).toBeNull()
    expect(s().revealPlayed.has('education')).toBe(true)
    expect(s().panel).toEqual({ kind: 'section', id: 'education' })
    expect(s().viewed.has('education')).toBe(true)
  })

  it('a revisit opens the panel at once', () => {
    useStore.setState({ revealPlayed: new Set(['skills']) })
    s().arrive('skills')
    expect(s().revealing).toBeNull()
    expect(s().panel).toEqual({ kind: 'section', id: 'skills' })
  })

  it('quick-nav Open never changes world visits or the tour target', () => {
    s().openSection('skills', { source: 'quicknav' })
    expect(s().worldVisited.size).toBe(0)
    expect(s().tourTarget).toBe('education')
  })

  it('closing a panel in the world moves the tour on to the next island not yet reached', () => {
    useStore.setState({ worldVisited: new Set(['education']) })
    s().openSection('education', { source: 'arrival' })
    s().closePanel()
    expect(s().tourTarget).toBe('experience')
  })

  it('closing the last panel ends the tour with no target', () => {
    useStore.setState({ worldVisited: new Set(WORLD.tourOrder) })
    s().openSection('contact', { source: 'arrival' })
    s().closePanel()
    expect(s().tourTarget).toBeNull()
  })

  it('Guide me there sets the target, and on touch requests a teleport to the arrival point', () => {
    s().guideMeThere('contact', false)
    expect(s().tourTarget).toBe('contact')
    expect(s().teleportRequest).toBeNull()
    s().guideMeThere('skills', true)
    expect(s().teleportRequest).toEqual(WORLD.islands.find((i) => i.id === 'skills')!.arrivalPoint)
  })

  it('ignores arrivals while a panel is open', () => {
    s().openSection('contact', { source: 'quicknav' })
    s().arrive('education')
    expect(s().worldVisited.size).toBe(0)
  })
})
