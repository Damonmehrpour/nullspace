import { beforeEach, describe, expect, it } from 'vitest'
import { initialState, isGameplayPaused, loadInitialState, useStore } from '../../src/state/store'

const s = () => useStore.getState()

beforeEach(() => {
  localStorage.clear()
  useStore.setState(initialState())
})

describe('store', () => {
  it('openSection from any source adds to viewed but never to worldVisited', () => {
    for (const source of ['portfolio', 'quicknav', 'arrival'] as const) s().openSection('education', { source })
    expect([...s().viewed]).toEqual(['education'])
    expect(s().worldVisited.size).toBe(0)
    expect(s().panel).toEqual({ kind: 'section', id: 'education' })
  })

  it('openProject marks the projects section viewed', () => {
    s().openProject('project-02', { source: 'artifact' })
    expect(s().panel).toEqual({ kind: 'project', id: 'project-02' })
    expect(s().viewed.has('projects')).toBe(true)
  })

  it('closePanel clears the panel and unpauses gameplay', () => {
    s().openSection('skills', { source: 'quicknav' })
    expect(isGameplayPaused(s())).toBe(true)
    s().closePanel()
    expect(s().panel).toBeNull()
    expect(isGameplayPaused(s())).toBe(false)
  })

  it('markWorldVisited is separate from viewed', () => {
    s().markWorldVisited('contact')
    expect([...s().worldVisited]).toEqual(['contact'])
    expect(s().viewed.size).toBe(0)
  })

  it('settings persist and reload from storage', () => {
    s().updateSettings({ typing: false, quality: 'low' })
    expect(loadInitialState().settings).toEqual({ typing: false, reducedMotion: 'system', subtitles: true, quality: 'low' })
  })

  it('mode preference persists', () => {
    s().setModePreference('portfolio')
    expect(loadInitialState().modePreference).toBe('portfolio')
  })

  it('starts with default settings when nothing is stored', () => {
    expect(s().settings).toEqual({ typing: true, reducedMotion: 'system', subtitles: true, quality: 'high' })
    expect(s().phase).toBe('boot')
  })
})
