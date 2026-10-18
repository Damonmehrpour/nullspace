import { describe, expect, it } from 'vitest'
import { dialogue } from '../../src/content/dialogue'
import { createDialogueDirector, type DialogueTable } from '../../src/core/dialogueDirector'

const table: DialogueTable = {
  greet: { lines: ['Hello.', 'Oh, you again.'], cooldownMs: 5000, probability: 1 },
  wait: { lines: ['Still there?'], cooldownMs: 20000, probability: 1 },
  firstMeet: { lines: ['Follow me.'], cooldownMs: 0, probability: 1, once: true },
  idle: { lines: ['...'], cooldownMs: 0, probability: 0 },
  'arrive:education': { lines: ['Education. Allegedly.'], cooldownMs: 0, probability: 1 },
}

const seeded = (seed = 1) => () => {
  seed = (seed * 16807) % 2147483647
  return (seed - 1) / 2147483646
}

describe('dialogue director', () => {
  it('returns a line from the pool on first emit', () => {
    const d = createDialogueDirector(table, seeded())
    expect(table.greet!.lines).toContain(d.emit('greet', 0))
  })

  it('respects the per-event cooldown', () => {
    const d = createDialogueDirector(table, seeded(), 0)
    expect(d.emit('greet', 0)).not.toBeNull()
    expect(d.emit('greet', 4000)).toBeNull()
    expect(d.emit('greet', 5000)).not.toBeNull()
  })

  it('keeps an 8 s silence between any two lines', () => {
    const d = createDialogueDirector(table, seeded())
    expect(d.emit('greet', 0)).not.toBeNull()
    expect(d.emit('wait', 7999)).toBeNull()
    expect(d.emit('wait', 8000)).not.toBeNull()
  })

  it('never repeats a once event', () => {
    const d = createDialogueDirector(table, seeded(), 0)
    expect(d.emit('firstMeet', 0)).toBe('Follow me.')
    expect(d.emit('firstMeet', 60000)).toBeNull()
  })

  it('stays silent at probability 0 and for unknown events', () => {
    const d = createDialogueDirector(table, seeded())
    expect(d.emit('idle', 0)).toBeNull()
    expect(d.emit('boundary', 0)).toBeNull()
  })

  it('drops blocked lines instead of queueing them', () => {
    const d = createDialogueDirector(table, seeded())
    d.emit('greet', 0)
    expect(d.emit('wait', 100)).toBeNull()
    expect(d.emit('arrive:education', 9000)).toBe('Education. Allegedly.')
    expect(d.emit('arrive:education', 9001)).toBeNull()
  })

  it('a blocked emit does not start that event’s cooldown', () => {
    const d = createDialogueDirector(table, seeded())
    d.emit('greet', 0)
    d.emit('wait', 100)
    expect(d.emit('wait', 8000)).toBe('Still there?')
  })
})

describe('dialogue content', () => {
  it('has lines for every context the spec names', () => {
    for (const key of ['firstMeet', 'greet', 'wait', 'boundary', 'tourComplete', 'skipTour'] as const) expect(dialogue[key]?.lines.length).toBeGreaterThan(0)
    for (const id of ['education', 'experience', 'projects', 'skills', 'contact'] as const) {
      expect(dialogue[`arrive:${id}`]?.lines.length).toBeGreaterThan(0)
      expect(dialogue[`revisit:${id}`]?.lines.length).toBeGreaterThan(0)
    }
  })

  it('keeps every line short', () => {
    for (const rule of Object.values(dialogue)) for (const line of rule!.lines) expect(line.length).toBeLessThanOrEqual(80)
  })
})
