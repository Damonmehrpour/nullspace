import { describe, expect, it } from 'vitest'
import { applyLook, cameraPose, createCameraRig, recenter, stepCameraRig, type CameraRigState } from '../../src/core/cameraRig'
import { CAMERA } from '../../src/core/config'
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

describe('orbit camera (look, pitch, zoom, recenter)', () => {
  const still = { playerPos: { x: 0, z: 0 }, playerVel: { x: 0, z: 0 }, guidePos: null }
  const walking = (dir: number) => ({ playerPos: { x: 0, z: 0 }, playerVel: { x: Math.cos(dir) * 3, z: Math.sin(dir) * 3 }, guidePos: null })

  it('turns and tilts with look input, within the pitch limits', () => {
    let r = createCameraRig(0)
    r = applyLook(r, { yaw: 0.5, pitch: 0, zoom: 0 })
    expect(r.yaw).toBeCloseTo(0.5)
    r = applyLook(r, { yaw: 0, pitch: -10, zoom: 0 })
    expect(r.pitch).toBeCloseTo(CAMERA.pitchMin)
    r = applyLook(r, { yaw: 0, pitch: 10, zoom: 0 })
    expect(r.pitch).toBeCloseTo(CAMERA.pitchMax)
  })

  it('zooms within limits', () => {
    let r = createCameraRig(0)
    r = applyLook(r, { yaw: 0, pitch: 0, zoom: 5 })
    expect(r.zoom).toBeCloseTo(CAMERA.zoomMax)
    r = applyLook(r, { yaw: 0, pitch: 0, zoom: -5 })
    expect(r.zoom).toBeCloseTo(CAMERA.zoomMin)
  })

  it('holds a hand-chosen view: no auto-follow until the visitor has left the camera alone for a while', () => {
    let r = applyLook(createCameraRig(0), { yaw: 0.01, pitch: 0, zoom: 0 })
    const yaw0 = r.yaw
    for (let i = 0; i < 20; i++) r = stepCameraRig(r, walking(1.2), 0.1, false) // 2 s of walking
    expect(r.yaw).toBeCloseTo(yaw0)
    for (let i = 0; i < 40; i++) r = stepCameraRig(r, walking(1.2), 0.1, false) // then it resumes following
    expect(r.yaw).toBeGreaterThan(yaw0 + 0.3)
  })

  it('recenters smoothly behind the player at the default tilt and distance', () => {
    let r = applyLook(createCameraRig(0), { yaw: 2, pitch: 0.5, zoom: 0.4 })
    r = recenter(r, 0.3)
    const first = stepCameraRig(r, still, 0.016, false)
    expect(Math.abs(first.yaw - 0.3)).toBeGreaterThan(0.05) // eased, not snapped
    for (let i = 0; i < 120; i++) r = stepCameraRig(r, still, 0.016, false)
    expect(r.yaw).toBeCloseTo(0.3, 2)
    expect(r.pitch).toBeCloseTo(CAMERA.pitchDefault, 2)
    expect(r.zoom).toBeCloseTo(1, 2)
  })

  it('poses the camera above the ground, lifting the view to look up at tall structures', () => {
    const base = cameraPose(createCameraRig(0))
    const up = cameraPose(applyLook(createCameraRig(0), { yaw: 0, pitch: -10, zoom: 0 }))
    expect(up.position[1]).toBeGreaterThanOrEqual(CAMERA.minHeight)
    expect(up.look[1]).toBeGreaterThan(base.look[1] + 2) // aims well above the player
    expect(up.look[1] - up.position[1]).toBeGreaterThan(2.5) // the view tilts upward
    const down = cameraPose(applyLook(createCameraRig(0), { yaw: 0, pitch: 10, zoom: 0 }))
    expect(down.position[1]).toBeGreaterThan(base.position[1])
  })

  it('zooming moves the camera closer or farther along the same view', () => {
    const near = cameraPose(applyLook(createCameraRig(0), { yaw: 0, pitch: 0, zoom: -5 }))
    const far = cameraPose(applyLook(createCameraRig(0), { yaw: 0, pitch: 0, zoom: 5 }))
    const d = (p: { position: number[] }) => Math.hypot(p.position[0], p.position[2])
    expect(d(far)).toBeGreaterThan(d(near) * 2)
  })
})
