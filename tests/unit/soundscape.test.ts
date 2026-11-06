import { describe, expect, it } from 'vitest'
import { AMBIENT_CHORDS, masterGain, midiHz, nextChord } from '../../src/audio/soundscape'

describe('sound levels', () => {
  it('is silent unless sound is switched on', () => {
    expect(masterGain({ sound: false, volume: 1 })).toBe(0)
  })
  it('follows the volume setting, gently (never louder than a quiet ambience)', () => {
    expect(masterGain({ sound: true, volume: 0 })).toBe(0)
    expect(masterGain({ sound: true, volume: 1 })).toBeLessThanOrEqual(0.5)
    expect(masterGain({ sound: true, volume: 0.5 })).toBeLessThan(masterGain({ sound: true, volume: 1 }))
  })
  it('clamps out-of-range volumes', () => {
    expect(masterGain({ sound: true, volume: 3 })).toBe(masterGain({ sound: true, volume: 1 }))
    expect(masterGain({ sound: true, volume: -1 })).toBe(0)
  })
})

describe('ambient harmony', () => {
  it('keeps every pad voice in a soft low-to-middle register (no shrill drones, no rumble)', () => {
    for (const chord of AMBIENT_CHORDS) {
      expect(chord).toHaveLength(4)
      for (const m of chord) {
        expect(midiHz(m)).toBeGreaterThan(90)
        expect(midiHz(m)).toBeLessThan(450)
      }
    }
  })
  it('moves gently: any two chords share a note, so a change never feels like a jump', () => {
    const pcs = (c: number[]) => new Set(c.map((m) => m % 12))
    for (const a of AMBIENT_CHORDS) for (const b of AMBIENT_CHORDS) expect([...pcs(a)].some((p) => pcs(b).has(p))).toBe(true)
  })
  it('always moves on to a different chord', () => {
    for (let i = 0; i < AMBIENT_CHORDS.length; i++)
      for (const r of [0, 0.3, 0.6, 0.999]) {
        const n = nextChord(i, () => r)
        expect(n).not.toBe(i)
        expect(n).toBeGreaterThanOrEqual(0)
        expect(n).toBeLessThan(AMBIENT_CHORDS.length)
      }
  })
  it('tunes A4 to 440 Hz', () => {
    expect(midiHz(69)).toBeCloseTo(440)
  })
})
