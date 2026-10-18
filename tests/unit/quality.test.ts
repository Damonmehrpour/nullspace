import { describe, expect, it } from 'vitest'
import { createQuality, onDecline, onIncline, renderBudget } from '../../src/core/quality'

describe('adaptive quality', () => {
  it('starts at the full budget for High', () => {
    const q = createQuality('high')
    expect(renderBudget(q)).toEqual({ dpr: 1.5, playerLight: true, spores: 60 })
  })

  it('the first decline lowers the pixel ratio, the second drops to Low', () => {
    let q = onDecline(createQuality('high'))
    expect(renderBudget(q).dpr).toBe(1)
    expect(q.effective).toBe('high')
    q = onDecline(q)
    expect(q.effective).toBe('low')
    expect(renderBudget(q)).toEqual({ dpr: 1, playerLight: false, spores: 24 })
  })

  it('never goes below Low', () => {
    let q = createQuality('high')
    for (let i = 0; i < 5; i++) q = onDecline(q)
    expect(q.effective).toBe('low')
    expect(renderBudget(q).dpr).toBe(1)
  })

  it('a chosen Low setting is always the Low budget', () => {
    expect(renderBudget(createQuality('low'))).toEqual({ dpr: 1, playerLight: false, spores: 24 })
  })

  it('an incline restores the pixel ratio but never overrides the visitor’s Low choice', () => {
    expect(renderBudget(onIncline(onDecline(createQuality('high')))).dpr).toBe(1.5)
    expect(renderBudget(onIncline(createQuality('low'))).dpr).toBe(1)
  })
})
