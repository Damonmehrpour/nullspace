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
  /** Elevation of the camera above the look point (rad). */
  pitch: number
  /** Distance multiplier. */
  zoom: number
  /** Seconds since the visitor last looked around by hand. */
  lookIdle: number
  /** While recentering: the yaw to ease back to. */
  recenterYaw: number | null
}

export type LookInput = { yaw: number; pitch: number; zoom: number }

const DEG = Math.PI / 180
/** Only auto-turn when walking roughly away from the camera; walking back toward it never flips the view. */
const MAX_TURN_FOLLOW_ANGLE = 100 * DEG
const REVERSAL_ANGLE = 120 * DEG
const MOVING_SPEED = 0.5

const angleDelta = (from: number, to: number) => Math.atan2(Math.sin(to - from), Math.cos(to - from))
const smooth = (dt: number, rate: number) => 1 - Math.exp(-dt * rate)

export function createCameraRig(yaw: number, aim: Vec2 = { x: 0, z: 0 }): CameraRigState {
  return { yaw, aim, extraDistance: 0, steadyTime: 0, lastMoveDir: null, reversalTime: 0, pitch: CAMERA.pitchDefault, zoom: 1, lookIdle: CAMERA.manualHoldS, recenterYaw: null }
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x))

/** Hand-driven looking (mouse drag, touch, keys): turn, tilt within limits, zoom. Cancels a recenter. */
export function applyLook(r: CameraRigState, look: LookInput): CameraRigState {
  if (look.yaw === 0 && look.pitch === 0 && look.zoom === 0) return r
  return {
    ...r,
    yaw: r.yaw + look.yaw,
    pitch: clamp(r.pitch + look.pitch, CAMERA.pitchMin, CAMERA.pitchMax),
    zoom: clamp(r.zoom * Math.exp(look.zoom), CAMERA.zoomMin, CAMERA.zoomMax),
    lookIdle: 0,
    recenterYaw: null,
  }
}

/** Ease back behind the player (facing yaw), at the default tilt and distance. */
export function recenter(r: CameraRigState, facing: number): CameraRigState {
  return { ...r, recenterYaw: facing }
}

/**
 * Camera position and look point for a rig: orbiting the aim at `radius·zoom`, `pitch` above it. Below
 * the default tilt the look point rises (up to lookLiftMax), so looking up brings tall and floating
 * structures into frame instead of only showing the ground; the camera never dips under minHeight.
 */
export function cameraPose(r: CameraRigState, p: { radius?: number; lookHeight?: number; lookAhead?: number } = {}): { position: [number, number, number]; look: [number, number, number] } {
  const radius = (p.radius ?? CAMERA.radius) * r.zoom + r.extraDistance
  const lookHeight = p.lookHeight ?? CAMERA.lookHeight
  const ahead = p.lookAhead ?? CAMERA.lookAhead
  const lift = clamp((CAMERA.pitchDefault - r.pitch) / (CAMERA.pitchDefault - CAMERA.pitchMin), 0, 1) * CAMERA.lookLiftMax
  const fwd = v.fromAngle(r.yaw)
  const horizontal = radius * Math.cos(r.pitch)
  return {
    position: [r.aim.x - fwd.x * horizontal, Math.max(CAMERA.minHeight, lookHeight + radius * Math.sin(r.pitch)), r.aim.z - fwd.z * horizontal],
    look: [r.aim.x + fwd.x * ahead, lookHeight + lift, r.aim.z + fwd.z * ahead],
  }
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

  let { steadyTime, lastMoveDir, reversalTime, yaw, pitch, zoom, recenterYaw } = r
  const lookIdle = r.lookIdle + dt
  if (recenterYaw !== null) {
    const k = smooth(dt, CAMERA.recenterRate)
    yaw += angleDelta(yaw, recenterYaw) * k
    pitch += (CAMERA.pitchDefault - pitch) * k
    zoom += (1 - zoom) * k
    if (Math.abs(angleDelta(yaw, recenterYaw)) < 1e-4 && Math.abs(pitch - CAMERA.pitchDefault) < 1e-4 && Math.abs(zoom - 1) < 1e-4) recenterYaw = null
  }
  // A hand-chosen view is respected: auto-follow only resumes after the visitor leaves the camera alone.
  const follow = recenterYaw === null && lookIdle >= CAMERA.manualHoldS
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
      if (follow && steadyTime >= CAMERA.steadyBeforeTurnS && Math.abs(diff) <= MAX_TURN_FOLLOW_ANGLE) {
        const rate = CAMERA.turnRateDegPerS * DEG * (reducedMotion ? 0.5 : 1)
        yaw += Math.sign(diff) * Math.min(Math.abs(diff), rate * dt)
      }
    }
  }

  return { yaw, aim, extraDistance, steadyTime, lastMoveDir, reversalTime, pitch, zoom, lookIdle, recenterYaw }
}
