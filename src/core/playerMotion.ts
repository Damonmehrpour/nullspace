import type { WorldLayout } from '../content/world'
import { MAX_DT, PLAYER } from './config'
import { v, type Vec2 } from './geometry'
import type { InputState } from './input'
import type { Walkable } from './walkable'

export type PlayerState = { pos: Vec2; vel: Vec2; facing: number; edgePushTime: number; boundaryFired: boolean }

export function createPlayer(layout: WorldLayout): PlayerState {
  return { pos: layout.spawn.pos, vel: { x: 0, z: 0 }, facing: layout.spawn.facing, edgePushTime: 0, boundaryFired: false }
}

/** Desired ground direction from held keys, relative to the camera's ground yaw. Zero when idle. */
export function inputDirection(input: InputState, cameraYaw: number): Vec2 {
  const fwd = Number(input.up) - Number(input.down)
  const side = Number(input.right) - Number(input.left)
  if (fwd === 0 && side === 0) return { x: 0, z: 0 }
  const forward = v.fromAngle(cameraYaw)
  const right = v.fromAngle(cameraYaw + Math.PI / 2)
  return v.normalize(v.add(v.scale(forward, fwd), v.scale(right, side)))
}

/**
 * One frame of kinematic movement. The position only ever advances through walk.sweep, so the
 * player can slide along edges but never cross a gap. Emits 'boundary' once per sustained push.
 */
export function stepPlayer(
  s: PlayerState,
  input: InputState,
  cameraYaw: number,
  rawDt: number,
  walk: Walkable,
  paused: boolean,
): { state: PlayerState; events: Array<'boundary'> } {
  if (paused) return { state: { ...s, vel: { x: 0, z: 0 }, edgePushTime: 0 }, events: [] }
  const dt = Math.min(Math.max(rawDt, 0), MAX_DT)
  const dir = inputDirection(input, cameraYaw)
  const target = v.scale(dir, PLAYER.speed)
  const k = 1 - Math.exp(-dt / (PLAYER.accelTime / 3))
  let vel = v.lerp(s.vel, target, k)
  if (v.len(vel) > PLAYER.speed) vel = v.scale(v.normalize(vel), PLAYER.speed)
  if (v.len(vel) < 1e-4 && v.len(target) === 0) vel = { x: 0, z: 0 }

  const intended = v.scale(vel, dt)
  const pos = walk.sweep(s.pos, v.add(s.pos, intended))
  const moved = v.sub(pos, s.pos)
  const actualVel = dt > 0 ? v.scale(moved, 1 / dt) : { x: 0, z: 0 }

  const pushing = v.len(target) > 0 && v.len(moved) < 0.5 * v.len(intended)
  const edgePushTime = pushing ? s.edgePushTime + dt : 0
  const events: Array<'boundary'> = []
  let boundaryFired = pushing ? s.boundaryFired : false
  if (pushing && !boundaryFired && edgePushTime >= PLAYER.boundaryPushS) {
    events.push('boundary')
    boundaryFired = true
  }

  const facing = v.len(dir) > 0 ? v.angleOf(dir) : s.facing
  return { state: { pos, vel: pushing ? actualVel : vel, facing, edgePushTime, boundaryFired }, events }
}
