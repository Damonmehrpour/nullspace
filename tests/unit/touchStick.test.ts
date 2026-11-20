import { describe, expect, it } from 'vitest'
import { STICK_DEAD_ZONE, stickFromDrag } from '../../src/core/touchStick'

describe('stickFromDrag', () => {
  it('ignores small offsets inside the dead zone, so a resting thumb never drifts', () => {
    expect(stickFromDrag(0, 0, 50)).toEqual({ x: 0, y: 0 })
    expect(stickFromDrag(50 * STICK_DEAD_ZONE * 0.9, 0, 50)).toEqual({ x: 0, y: 0 })
  })
  it('reaches full speed at the stick radius and caps beyond it; up on screen is forward', () => {
    const up = stickFromDrag(0, -50, 50)
    expect(up.x).toBeCloseTo(0)
    expect(up.y).toBeCloseTo(1)
    const far = stickFromDrag(200, 0, 50)
    expect(far.x).toBeCloseTo(1)
  })
  it('ramps smoothly from the dead zone to full speed', () => {
    const half = stickFromDrag(0, -50 * (STICK_DEAD_ZONE + (1 - STICK_DEAD_ZONE) / 2), 50)
    expect(half.y).toBeCloseTo(0.5)
  })
})
