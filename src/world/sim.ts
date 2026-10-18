// Mutable per-frame simulation state, advanced only by simulate(dt). Components read it in useFrame.
// Keeping one step function makes a deterministic test clock possible (plan Task 25).
import { WORLD } from '../content/world'
import { createCameraRig, stepCameraRig, type CameraRigState } from '../core/cameraRig'
import { createGuide, stepGuide, type GuidePose, type GuideState } from '../core/guideBrain'
import type { InputState } from '../core/input'
import { createPlayer, stepPlayer, type PlayerState } from '../core/playerMotion'
import { buildRouteGraph } from '../core/routeGraph'
import { createWalkable } from '../core/walkable'
import { isGameplayPaused, useStore } from '../state/store'

export const walk = createWalkable(WORLD)
export const graph = buildRouteGraph(WORLD)

export type SimEvent = 'boundary' | 'firstMeet' | 'greet' | 'wait' | 'idle'

export type Sim = {
  player: PlayerState
  rig: CameraRigState
  guide: GuideState
  guidePose: GuidePose
  input: { state: InputState; clear(): void; dispose(): void } | null
  listeners: Set<(events: SimEvent[]) => void>
  /** Zone the player entered this step, consumed by arrival wiring (Task 25). */
  enteredZone: import('../content/schema').SectionId | null
}

function freshGuide() {
  const guide = createGuide(WORLD)
  const pose = stepGuide(guide, { graph, playerPos: WORLD.spawn.pos, playerSpeed: 0, target: null, playerEnteredZone: null, dt: 0 }).pose
  return { guide, pose }
}

export const sim: Sim = {
  player: createPlayer(WORLD),
  rig: createCameraRig(WORLD.spawn.facing, WORLD.spawn.pos),
  guide: freshGuide().guide,
  guidePose: freshGuide().pose,
  input: null,
  listeners: new Set(),
  enteredZone: null,
}

const NO_INPUT: InputState = { up: false, down: false, left: false, right: false, interact: false }

export function resetSim(): void {
  sim.player = createPlayer(WORLD)
  sim.rig = createCameraRig(WORLD.spawn.facing, WORLD.spawn.pos)
  const g = freshGuide()
  sim.guide = g.guide
  sim.guidePose = g.pose
  sim.enteredZone = null
}

export function reducedMotion(): boolean {
  const pref = useStore.getState().settings.reducedMotion
  if (pref !== 'system') return pref === 'on'
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/** Advances gameplay by dt seconds: input → player → guide → (zones, Task 25) → camera rig. */
export function simulate(dt: number): void {
  const store = useStore.getState()
  const paused = isGameplayPaused(store)
  if (paused) sim.input?.clear()
  const events: SimEvent[] = []

  const p = stepPlayer(sim.player, sim.input?.state ?? NO_INPUT, sim.rig.yaw, dt, walk, paused)
  sim.player = p.state
  events.push(...p.events)

  if (!paused) {
    const g = stepGuide(sim.guide, {
      graph,
      playerPos: sim.player.pos,
      playerSpeed: Math.hypot(sim.player.vel.x, sim.player.vel.z),
      target: store.tourTarget,
      playerEnteredZone: sim.enteredZone,
      dt,
    })
    sim.guide = g.guide
    sim.guidePose = g.pose
    events.push(...g.events)
  }

  sim.rig = stepCameraRig(sim.rig, { playerPos: sim.player.pos, playerVel: sim.player.vel, guidePos: sim.guide.pos }, dt, reducedMotion())
  if (events.length > 0) for (const l of sim.listeners) l(events)
}
