import { beforeEach, describe, expect, it } from 'vitest'
import { initialState, useStore } from '../../src/state/store'

const s = () => useStore.getState()

beforeEach(() => useStore.setState({ ...initialState(), phase: 'world', tourTarget: 'education' }))

describe('reveal cancellation (Review Focus 3)', () => {
  it('quick-nav during a reveal opens the requested panel and the reveal never reopens', () => {
    s().arrive('education')
    s().tickReveal(0.5)
    s().openSection('contact', { source: 'quicknav' })
    expect(s().panel).toEqual({ kind: 'section', id: 'contact' })
    expect(s().revealing).toBeNull()
    expect(s().revealPlayed.has('education')).toBe(true)
    s().tickReveal(2)
    expect(s().panel).toEqual({ kind: 'section', id: 'contact' })
  })

  it('an artifact opened during a reveal also cancels it', () => {
    s().arrive('projects')
    s().openProject('project-02', { source: 'artifact' })
    expect(s().revealing).toBeNull()
    expect(s().revealPlayed.has('projects')).toBe(true)
  })

  it('rapid repeated opens of the same section give one panel and one viewed entry', () => {
    for (let i = 0; i < 5; i++) s().openSection('skills', { source: 'quicknav' })
    expect(s().panel).toEqual({ kind: 'section', id: 'skills' })
    expect([...s().viewed]).toEqual(['skills'])
  })

  it('an arrival while a panel is open is ignored', () => {
    s().openSection('contact', { source: 'quicknav' })
    s().arrive('education')
    expect(s().revealing).toBeNull()
    expect(s().worldVisited.size).toBe(0)
  })

  it('a completed reveal opens its panel exactly once', () => {
    s().arrive('education')
    s().tickReveal(2.5)
    s().closePanel()
    s().tickReveal(5)
    expect(s().panel).toBeNull()
  })

  it('exposes reveal progress from 0 to 1', () => {
    s().arrive('education')
    s().tickReveal(1)
    expect(s().revealProgress()).toBeCloseTo(0.5, 2)
  })
})
