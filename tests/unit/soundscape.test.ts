import { describe, expect, it } from 'vitest'
import { masterGain } from '../../src/audio/soundscape'

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
