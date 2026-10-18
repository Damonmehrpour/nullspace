import { describe, expect, it } from 'vitest'
import { createCameraRig, stepCameraRig, type CameraRigState } from '../../src/core/cameraRig'
import { v } from '../../src/core/geometry'

const DT = 1 / 60
const origin = { x: 0, z: 0 }

function run(r: CameraRigState, seconds: number, t: { playerPos?: { x: number; z: number }; playerVel: { x: number; z: number }; guidePos?: { x: number; z: number } | null }, reduced = false) {
  for (let i = 0; i < Math.round(seconds * 60); i++) r = stepCameraRig(r, { playerPos: t.playerPos ?? origin, playerVel: t.playerVel, guidePos: t.guidePos ?? null }, DT, reduced)
  return r
}

const angleDiff = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)))

describe('camera rig', () => {
  it('biases the aim at most 15% towards a nearby guide', () => {
    const r = run(createCameraRig(0), 1, { playerVel: { x: 0, z: 0 }, guidePos: { x: 3, z: 0 } })
    expect(r.aim.x).toBeGreaterThan(0)
    expect(r.aim.x).toBeLessThanOrEqual(0.45 + 1e-9)
  })

  it('ignores a guide more than 10 m away', () => {
    const r = run(createCameraRig(0), 1, { playerVel: { x: 0, z: 0 }, guidePos: { x: 12, z: 0 } })
    expect(v.len(r.aim)).toBeLessThan(1e-9)
  })

  it('turns at most 60 degrees per second', () => {
    const start = createCameraRig(0)
    const r = run(start, 1.4, { playerVel: { x: 0, z: 4 } })
    expect(angleDiff(r.yaw, 0)).toBeLessThanOrEqual((60 * Math.PI) / 180 + 1e-6)
    expect(angleDiff(r.yaw, 0)).toBeGreaterThan((50 * Math.PI) / 180)
  })

  it('does not turn during the first 0.4 s of movement', () => {
    const r = run(createCameraRig(0), 0.38, { playerVel: { x: 0, z: 4 } })
    expect(r.yaw).toBe(0)
  })

  it('ignores a quick 0.2 s reversal', () => {
    let r = run(createCameraRig(0), 1, { playerVel: { x: 4, z: 0 } })
    const before = r.yaw
    r = run(r, 0.2, { playerVel: { x: -4, z: 0 } })
    expect(r.yaw).toBeCloseTo(before, 6)
  })

  it('never pulls back more than 1.5 m', () => {
    const r = run(createCameraRig(0), 3, { playerVel: { x: 0, z: 0 }, guidePos: { x: 9.5, z: 0 } })
    expect(r.extraDistance).toBeLessThanOrEqual(1.5)
    expect(r.extraDistance).toBeGreaterThan(0)
  })

  it('turns at half speed with reduced motion', () => {
    const r = run(createCameraRig(0), 2, { playerVel: { x: 0, z: 4 } }, true)
    expect(angleDiff(r.yaw, 0)).toBeLessThanOrEqual((30 * Math.PI) / 180 * 1.6 + 1e-6)
  })

  it('never swings round when the player walks back towards the camera', () => {
    const r = run(createCameraRig(0), 2, { playerVel: { x: -4, z: 0 } })
    expect(r.yaw).toBe(0)
  })

  it('a 5 s frame does not snap the camera', () => {
    const r = stepCameraRig(createCameraRig(0), { playerPos: origin, playerVel: { x: 0, z: 4 }, guidePos: null }, 5, false)
    expect(angleDiff(r.yaw, 0)).toBeLessThanOrEqual((6 * Math.PI) / 180 + 1e-6)
  })
})
