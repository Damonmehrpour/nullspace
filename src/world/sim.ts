// Mutable per-frame simulation state, advanced only by simulate(dt). Components read it in useFrame.
// Keeping one step function makes a deterministic test clock possible (plan Task 25).
import { WORLD } from '../content/world'
import { createCameraRig, stepCameraRig, type CameraRigState } from '../core/cameraRig'
import type { InputState } from '../core/input'
import { createPlayer, stepPlayer, type PlayerState } from '../core/playerMotion'
import { createWalkable } from '../core/walkable'
import { isGameplayPaused, useStore } from '../state/store'

export const walk = createWalkable(WORLD)

export type Sim = {
  player: PlayerState
  rig: CameraRigState
  input: { state: InputState; clear(): void; dispose(): void } | null
  listeners: Set<(events: string[]) => void>
}

export const sim: Sim = {
  player: createPlayer(WORLD),
  rig: createCameraRig(WORLD.spawn.facing, WORLD.spawn.pos),
  input: null,
  listeners: new Set(),
}

const NO_INPUT: InputState = { up: false, down: false, left: false, right: false, interact: false }

export function resetSim(): void {
  sim.player = createPlayer(WORLD)
  sim.rig = createCameraRig(WORLD.spawn.facing, WORLD.spawn.pos)
}

function reducedMotion(): boolean {
  const pref = useStore.getState().settings.reducedMotion
  if (pref !== 'system') return pref === 'on'
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/** Advances gameplay by dt seconds: input → player → (guide, zones in later tasks) → camera rig. */
export function simulate(dt: number): void {
  const paused = isGameplayPaused(useStore.getState())
  if (paused) sim.input?.clear()
  const r = stepPlayer(sim.player, sim.input?.state ?? NO_INPUT, sim.rig.yaw, dt, walk, paused)
  sim.player = r.state
  if (r.events.length > 0) for (const l of sim.listeners) l(r.events)
  sim.rig = stepCameraRig(sim.rig, { playerPos: sim.player.pos, playerVel: sim.player.vel, guidePos: null }, dt, reducedMotion())
}
