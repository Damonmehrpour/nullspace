// Mutable per-frame simulation state, advanced only by simulate(dt). Components read it in useFrame.
// One step function means tests can freeze the clock and advance it deterministically.
import type { SectionId } from '../content/schema'
import { WORLD } from '../content/world'
import { cv } from '../content/cv'
import { artifactInRange } from '../core/arrival'
import { createCameraRig, stepCameraRig, type CameraRigState } from '../core/cameraRig'
import { v, type Vec2 } from '../core/geometry'
import { createGuide, stepGuide, type GuidePose, type GuideState } from '../core/guideBrain'
import type { InputState } from '../core/input'
import { createPlayer, stepPlayer, type PlayerState } from '../core/playerMotion'
import { buildRouteGraph } from '../core/routeGraph'
import { createQuality, type QualityState } from '../core/quality'
import { createZoneTracker, updateZones, type ZoneTracker } from '../core/tour'
import { createWalkable } from '../core/walkable'
import { isReducedMotion } from '../state/reducedMotion'
import { isGameplayPaused, useStore } from '../state/store'

export const walk = createWalkable(WORLD)
export const graph = buildRouteGraph(WORLD)

export type SimEvent = 'boundary' | 'firstMeet' | 'greet' | 'wait' | 'idle'

export type Sim = {
  player: PlayerState
  rig: CameraRigState
  guide: GuideState
  guidePose: GuidePose
  zones: ZoneTracker
  input: { state: InputState; clear(): void; dispose(): void } | null
  listeners: Set<(events: SimEvent[], entered: SectionId | null) => void>
  /** Test clock: when frozen, only advance() moves the simulation. */
  frozen: boolean
  /** Test autopilot: remaining waypoints the player walks along, overriding keyboard input. */
  autopilot: Vec2[] | null
  /** Interact key state from the previous step, so a held key triggers once. */
  interactHeld: boolean
  /** Last frame's renderer stats, for profiling. */
  renderInfo: { calls: number; triangles: number }
  /** Current adaptive quality, mirrored here for tests and the debug overlay. */
  quality: QualityState
}

function freshGuide() {
  const guide = createGuide(WORLD)
  const pose = stepGuide(guide, { graph, playerPos: WORLD.spawn.pos, playerSpeed: 0, target: null, playerEnteredZone: null, dt: 0 }).pose
  return { guide, pose }
}

export const sim: Sim = {
  player: createPlayer(WORLD),
  rig: createCameraRig(WORLD.spawn.facing, WORLD.spawn.pos),
  ...(() => {
    const g = freshGuide()
    return { guide: g.guide, guidePose: g.pose }
  })(),
  zones: createZoneTracker(WORLD.tourOrder),
  input: null,
  listeners: new Set(),
  frozen: false,
  autopilot: null,
  interactHeld: false,
  renderInfo: { calls: 0, triangles: 0 },
  quality: createQuality('high'),
}

const PROJECTS = WORLD.islands.find((i) => i.id === 'projects')!
const NO_INPUT: InputState = { up: false, down: false, left: false, right: false, interact: false }
const FORWARD: InputState = { ...NO_INPUT, up: true }

export function resetSim(): void {
  sim.player = createPlayer(WORLD)
  sim.rig = createCameraRig(WORLD.spawn.facing, WORLD.spawn.pos)
  const g = freshGuide()
  sim.guide = g.guide
  sim.guidePose = g.pose
  sim.zones = createZoneTracker(WORLD.tourOrder)
  sim.autopilot = null
  sim.interactHeld = false
}

export const reducedMotion = () => isReducedMotion(useStore.getState().settings)

/** Moves the player instantly (touch "Guide me there", tests). Arrival points are walkable by validation. */
export function teleportPlayer(pos: Vec2): void {
  sim.player = { ...sim.player, pos, vel: { x: 0, z: 0 }, edgePushTime: 0, boundaryFired: false }
  sim.autopilot = null
}

function autopilotInput(): { input: InputState; yaw: number } | null {
  const path = sim.autopilot
  if (!path) return null
  while (path.length > 0 && v.dist(sim.player.pos, path[0]) < 0.3) path.shift()
  if (path.length === 0) {
    sim.autopilot = null
    return null
  }
  return { input: FORWARD, yaw: v.angleOf(v.sub(path[0], sim.player.pos)) }
}

/** Advances gameplay by dt seconds: input → player → zones → guide → reveal → camera rig. */
export function simulate(dt: number): void {
  const store = useStore.getState()
  if (store.teleportRequest) {
    const to = store.teleportRequest
    teleportPlayer(to)
    // Touch travel: bring the guide along so it waits at the island instead of beckoning from afar.
    if (store.tourTarget) sim.guide = { ...sim.guide, name: 'present', pos: to, target: store.tourTarget, path: [to], pathIndex: 1, timer: 0, met: true }
    store.clearTeleport()
  }
  const paused = isGameplayPaused(store)
  if (paused) sim.input?.clear()
  const events: SimEvent[] = []

  const auto = paused ? null : autopilotInput()
  const p = stepPlayer(sim.player, auto?.input ?? sim.input?.state ?? NO_INPUT, auto?.yaw ?? sim.rig.yaw, dt, walk, paused)
  sim.player = p.state
  events.push(...p.events)

  const near = paused ? null : artifactInRange(sim.player.pos, PROJECTS.artifactSlots)
  store.setNearArtifact(near)
  const interact = !paused && (sim.input?.state.interact ?? false)
  if (interact && !sim.interactHeld) {
    const slot = near
    if (slot !== null) store.openProject(cv.projects.projects[slot].id, { source: 'artifact' })
  }
  sim.interactHeld = interact

  let entered: SectionId | null = null
  if (!paused && !isGameplayPaused(useStore.getState())) {
    const z = updateZones(sim.zones, sim.player.pos, WORLD.islands)
    sim.zones = z.tracker
    entered = z.entered
    if (entered && !store.revealing) store.arrive(entered)

    const g = stepGuide(sim.guide, {
      graph,
      playerPos: sim.player.pos,
      playerSpeed: Math.hypot(sim.player.vel.x, sim.player.vel.z),
      target: useStore.getState().tourTarget,
      playerEnteredZone: entered,
      dt,
    })
    sim.guide = g.guide
    sim.guidePose = g.pose
    events.push(...g.events)
  }

  useStore.getState().tickReveal(Math.min(dt, 0.1))
  sim.rig = stepCameraRig(sim.rig, { playerPos: sim.player.pos, playerVel: sim.player.vel, guidePos: sim.guide.pos }, dt, reducedMotion())
  if (events.length > 0 || entered) for (const l of sim.listeners) l(events, entered)
}
