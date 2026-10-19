import { describe, expect, it } from 'vitest'
import { createQuality, detectQualityTier, onDecline, onIncline, renderBudget } from '../../src/core/quality'

describe('adaptive quality', () => {
  it('High is the full budget; Medium and Low trade detail for speed (never shader variants)', () => {
    expect(renderBudget(createQuality('high'))).toEqual({ dpr: 1.5, detail: 'high', playerLight: true, spores: 60, dust: 420 })
    expect(renderBudget(createQuality('medium'))).toEqual({ dpr: 1, detail: 'medium', playerLight: true, spores: 40, dust: 220 })
    expect(renderBudget(createQuality('low'))).toEqual({ dpr: 1, detail: 'low', playerLight: false, spores: 24, dust: 140 })
  })

  it('steps down gently: pixel ratio first, then Medium, then Low, never below Low', () => {
    let q = onDecline(createQuality('high'))
    expect(q.effective).toBe('high')
    expect(renderBudget(q).dpr).toBe(1)
    q = onDecline(q)
    expect(q.effective).toBe('medium')
    q = onDecline(q)
    expect(q.effective).toBe('low')
    for (let i = 0; i < 4; i++) q = onDecline(q)
    expect(q.effective).toBe('low')
  })

  it('climbs back up to, but never above, the chosen level', () => {
    let q = createQuality('medium')
    q = onIncline(onDecline(q))
    expect(q.effective).toBe('medium')
    q = onIncline(q)
    expect(q.effective).toBe('medium')
    expect(onIncline(createQuality('low')).effective).toBe('low')
    expect(renderBudget(onIncline(onDecline(createQuality('high')))).dpr).toBe(1.5)
  })

  it('Auto starts at the detected level and treats it as the ceiling', () => {
    const q = createQuality('auto', 'medium')
    expect(q.effective).toBe('medium')
    expect(onIncline(q).effective).toBe('medium')
    expect(createQuality('auto', 'high').effective).toBe('high')
    expect(createQuality('high', 'low').effective).toBe('high') // an explicit choice wins
  })

  it('stops flip-flopping: after three recoveries, the next drop to Low is final', () => {
    let q = createQuality('high')
    for (let i = 0; i < 3; i++) {
      q = onDecline(onDecline(onDecline(q)))
      q = onIncline(onIncline(onIncline(q)))
    }
    q = onDecline(onDecline(onDecline(q)))
    expect(q.effective).toBe('low')
    expect(onIncline(q).effective).toBe('low')
  })
})

describe('hardware detection (conservative defaults)', () => {
  const desktop = { renderer: 'ANGLE (NVIDIA GeForce RTX 3060 Direct3D11)', cores: 12, memory: 16, touch: false }
  it('a discrete desktop GPU starts at High', () => {
    expect(detectQualityTier(desktop)).toBe('high')
  })
  it('integrated or mobile GPUs start at Medium', () => {
    for (const renderer of ['ANGLE (Intel(R) UHD Graphics 620 Direct3D11)', 'Mali-G78', 'Adreno (TM) 650', 'Apple GPU']) expect(detectQualityTier({ ...desktop, renderer }), renderer).toBe('medium')
  })
  it('few cores or little memory start at Medium', () => {
    expect(detectQualityTier({ ...desktop, cores: 4 })).toBe('medium')
    expect(detectQualityTier({ ...desktop, memory: 4 })).toBe('medium')
  })
  it('software rendering and small touch devices start at Low', () => {
    expect(detectQualityTier({ ...desktop, renderer: 'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)))' })).toBe('low')
    expect(detectQualityTier({ ...desktop, renderer: 'llvmpipe (LLVM 15.0.7)' })).toBe('low')
    expect(detectQualityTier({ renderer: 'Adreno (TM) 610', cores: 8, memory: 3, touch: true })).toBe('low')
  })
  it('a touch device starts no higher than Medium; unknown values count as unknown, not weak', () => {
    expect(detectQualityTier({ ...desktop, touch: true })).toBe('medium')
    expect(detectQualityTier({ renderer: '', cores: undefined, memory: undefined, touch: false })).toBe('high')
  })
})
