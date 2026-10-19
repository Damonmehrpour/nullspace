import { describe, expect, it } from 'vitest'
import { createStoryMoment } from '../../src/core/storyMoment'

const LINES = ['Oh… this is actually where I was first born.', 'Well, not exactly me. But the idea that became me started here.']

describe('story moment (a short scripted exchange that is never dropped)', () => {
  it('says nothing until triggered', () => {
    const m = createStoryMoment(LINES, 1500)
    expect(m.tick(0, false)).toBeNull()
    expect(m.active()).toBe(false)
  })

  it('says the first line as soon as nothing else is showing, then the second after the pause', () => {
    const m = createStoryMoment(LINES, 1500)
    m.trigger()
    expect(m.active()).toBe(true)
    expect(m.tick(100, false)).toBe(LINES[0])
    expect(m.tick(200, true)).toBeNull() // first line still on screen
    expect(m.tick(5000, false)).toBeNull() // cleared: the pause starts now
    expect(m.tick(6400, false)).toBeNull()
    expect(m.tick(6500, false)).toBe(LINES[1])
    expect(m.active()).toBe(true) // until the second line has been shown and cleared
    expect(m.tick(7000, true)).toBeNull()
    expect(m.tick(11000, false)).toBeNull()
    expect(m.active()).toBe(false)
  })

  it('waits (never drops) while another line or a panel is showing', () => {
    const m = createStoryMoment(LINES, 1500)
    m.trigger()
    expect(m.tick(0, true)).toBeNull()
    expect(m.tick(9000, true)).toBeNull()
    expect(m.tick(9100, false)).toBe(LINES[0])
  })

  it('plays only once per visit, however often it is triggered', () => {
    const m = createStoryMoment(LINES, 1500)
    m.trigger()
    m.tick(0, false)
    m.tick(1, true)
    m.tick(10, false)
    m.tick(2000, false)
    m.tick(2001, true)
    m.tick(9000, false)
    m.trigger()
    expect(m.tick(10000, false)).toBeNull()
    expect(m.active()).toBe(false)
  })
})
