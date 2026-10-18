import { CAMERA, MAX_DT } from './config'
import { v, type Vec2 } from './geometry'

/** Ground-plane camera state. The component turns it into a 3D position behind the player. */
export type CameraRigState = {
  yaw: number
  aim: Vec2
  extraDistance: number
  steadyTime: number
  lastMoveDir: number | null
  reversalTime: number
}

const DEG = Math.PI / 180
/** Only auto-turn when walking roughly away from the camera; walking back toward it never flips the view. */
const MAX_TURN_FOLLOW_ANGLE = 100 * DEG
const REVERSAL_ANGLE = 120 * DEG
const MOVING_SPEED = 0.5

const angleDelta = (from: number, to: number) => Math.atan2(Math.sin(to - from), Math.cos(to - from))
const smooth = (dt: number, rate: number) => 1 - Math.exp(-dt * rate)

export function createCameraRig(yaw: number, aim: Vec2 = { x: 0, z: 0 }): CameraRigState {
  return { yaw, aim, extraDistance: 0, steadyTime: 0, lastMoveDir: null, reversalTime: 0 }
}

/** Stability first: the player is the anchor, turns are slow, delayed and ignore quick reversals. */
export function stepCameraRig(
  r: CameraRigState,
  t: { playerPos: Vec2; playerVel: Vec2; guidePos: Vec2 | null },
  rawDt: number,
  reducedMotion: boolean,
): CameraRigState {
  const dt = Math.min(Math.max(rawDt, 0), MAX_DT)

  const guideDist = t.guidePos ? v.dist(t.guidePos, t.playerPos) : Infinity
  const biased = t.guidePos && guideDist <= CAMERA.guideBiasOffDistance
  const targetAim = biased ? v.lerp(t.playerPos, t.guidePos!, CAMERA.guideBiasMax) : t.playerPos
  const aim = v.lerp(r.aim, targetAim, smooth(dt, 6))

  const targetExtra = biased ? Math.min(CAMERA.pullbackMax, Math.max(0, (guideDist - 6) * 0.5)) : 0
  const extraDistance = Math.min(CAMERA.pullbackMax, r.extraDistance + (targetExtra - r.extraDistance) * smooth(dt, 2))

  let { steadyTime, lastMoveDir, reversalTime, yaw } = r
  const speed = v.len(t.playerVel)
  if (speed < MOVING_SPEED) {
    steadyTime = 0
    reversalTime = 0
    lastMoveDir = null
  } else {
    const dir = v.angleOf(t.playerVel)
    if (lastMoveDir !== null && Math.abs(angleDelta(lastMoveDir, dir)) > REVERSAL_ANGLE) {
      reversalTime += dt
      if (reversalTime >= CAMERA.ignoreReversalS) {
        lastMoveDir = dir
        steadyTime = 0
        reversalTime = 0
      }
    } else {
      lastMoveDir = dir
      reversalTime = 0
      steadyTime += dt
      const diff = angleDelta(yaw, dir)
      if (steadyTime >= CAMERA.steadyBeforeTurnS && Math.abs(diff) <= MAX_TURN_FOLLOW_ANGLE) {
        const rate = CAMERA.turnRateDegPerS * DEG * (reducedMotion ? 0.5 : 1)
        yaw += Math.sign(diff) * Math.min(Math.abs(diff), rate * dt)
      }
    }
  }

  return { yaw, aim, extraDistance, steadyTime, lastMoveDir, reversalTime }
}
