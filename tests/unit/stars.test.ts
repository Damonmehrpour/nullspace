import { describe, expect, it } from 'vitest'
import { buildStars, STAR_COUNTS } from '../../src/world/v2/stars'

describe('starfield', () => {
  const st = buildStars()
  const n = STAR_COUNTS.high

  it('places every star far beyond the islands, inside the sky dome', () => {
    for (let i = 0; i < n; i++) {
      const r = Math.hypot(st.pos[i * 3], st.pos[i * 3 + 1], st.pos[i * 3 + 2])
      expect(r).toBeGreaterThanOrEqual(299)
      expect(r).toBeLessThanOrEqual(421)
    }
  })

  it('stays subtle: no star brighter than full, and most of them faint', () => {
    expect(Math.max(...st.bright)).toBeLessThanOrEqual(1)
    const faint = [...st.bright].filter((b) => b < 0.6).length
    expect(faint / n).toBeGreaterThan(0.7)
  })

  it('is deterministic, so every visit shows the same sky', () => {
    expect(buildStars().pos).toEqual(st.pos)
  })

  it('spreads the Low-quality subset over the whole sky (every quadrant, above and below)', () => {
    const quad = new Set<string>()
    for (let i = 0; i < STAR_COUNTS.low; i++) quad.add(`${Math.sign(st.pos[i * 3])}${Math.sign(st.pos[i * 3 + 1])}${Math.sign(st.pos[i * 3 + 2])}`)
    expect(quad.size).toBe(8)
  })
})
