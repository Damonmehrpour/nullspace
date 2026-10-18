import type { SectionId } from '../content/schema'
import type { WorldLayout } from '../content/world'
import { GUIDE, MAX_DT, PLAYER } from './config'
import { distToSegment, v, type Vec2 } from './geometry'
import { arrivalNodeId, nearestNode, shortestPath, type RouteGraph } from './routeGraph'

export type GuideStateName = 'idle' | 'lead' | 'wait' | 'greet' | 'present' | 'arrive'

export type GuidePose = {
  position: Vec2
  height: number
  facing: number
  state: GuideStateName
  squash: number
  glow: number
  beckon: number
  speakPulse: number
}

export type GuideEvent = 'firstMeet' | 'greet' | 'wait' | 'idle'

export type GuideState = {
  name: GuideStateName
  pos: Vec2
  /** Route polyline; path[0] is where the guide was when it planned, so following it never jumps. */
  path: Vec2[]
  pathIndex: number
  target: SectionId | null
  timer: number
  met: boolean
  waitEmitted: boolean
  speakPulse: number
  facing: number
}

export type GuideContext = {
  graph: RouteGraph
  playerPos: Vec2
  playerSpeed: number
  target: SectionId | null
  playerEnteredZone: SectionId | null
  dt: number
}

/** Gentle minimum walking pace while leading, so a stopped player falls behind and triggers a wait. */
const MIN_LEAD_PACE = 1.2
const SPEED_CAP = PLAYER.speed * GUIDE.speedCapFactor
const SPEAK_DECAY_S = 0.4
const DESIRED_AHEAD = (GUIDE.leadAheadMin + GUIDE.leadAheadMax) / 2

export function createGuide(layout: WorldLayout): GuideState {
  return {
    name: 'greet',
    pos: layout.monolith.slit,
    path: [],
    pathIndex: 0,
    target: null,
    timer: 0,
    met: false,
    waitEmitted: false,
    speakPulse: 0,
    facing: layout.spawn.facing,
  }
}

export function pulseSpeak(g: GuideState): GuideState {
  return { ...g, speakPulse: 1 }
}

function plan(g: GuideState, graph: RouteGraph, target: SectionId | null): GuideState {
  if (!target) return { ...g, target, path: [], pathIndex: 0 }
  const nodes = shortestPath(graph, nearestNode(graph, g.pos), arrivalNodeId(target))
  return { ...g, target, path: [g.pos, ...nodes], pathIndex: 1 }
}

function offRoute(g: GuideState): boolean {
  if (g.path.length < 2 || g.pathIndex >= g.path.length) return false
  return distToSegment(g.pos, g.path[g.pathIndex - 1], g.path[g.pathIndex]) > GUIDE.offRouteSnap
}

/** Moves along the path by `budget` metres. Returns the new state and whether the end was reached. */
function advance(g: GuideState, budget: number): { g: GuideState; done: boolean } {
  let { pos, pathIndex } = g
  let facing = g.facing
  while (budget > 0 && pathIndex < g.path.length) {
    const next = g.path[pathIndex]
    const d = v.dist(pos, next)
    if (d > 1e-9) facing = v.angleOf(v.sub(next, pos))
    if (d <= budget) {
      pos = next
      budget -= d
      pathIndex++
    } else {
      pos = v.lerp(pos, next, budget / d)
      budget = 0
    }
  }
  return { g: { ...g, pos, pathIndex, facing }, done: pathIndex >= g.path.length }
}

const faceToward = (from: Vec2, to: Vec2, fallback: number) => (v.dist(from, to) > 1e-6 ? v.angleOf(v.sub(to, from)) : fallback)

function toState(g: GuideState, name: GuideStateName): GuideState {
  return { ...g, name, timer: 0, waitEmitted: name === 'wait' ? false : g.waitEmitted }
}

export function stepGuide(g0: GuideState, ctx: GuideContext): { guide: GuideState; pose: GuidePose; events: GuideEvent[] } {
  const dt = Math.min(Math.max(ctx.dt, 0), MAX_DT)
  const events: GuideEvent[] = []
  let g: GuideState = { ...g0, timer: g0.timer + dt, speakPulse: Math.max(0, g0.speakPulse - dt / SPEAK_DECAY_S) }

  if (!g.met && g.name === 'greet' && g0.timer === 0) events.push('firstMeet')

  if (ctx.target !== g.target) {
    g = plan(g, ctx.graph, ctx.target)
    if (g.name === 'present' || g.name === 'idle') g = toState(g, ctx.target ? 'lead' : 'idle')
  }
  if ((g.name === 'lead' || g.name === 'wait') && offRoute(g)) {
    g = plan({ ...g, pos: ctx.graph.nodes.get(nearestNode(ctx.graph, g.pos))!.pos }, ctx.graph, g.target)
  }

  const d = v.dist(g.pos, ctx.playerPos)

  switch (g.name) {
    case 'greet':
      g.facing = faceToward(g.pos, ctx.playerPos, g.facing)
      if (g.timer >= GUIDE.greetS) g = toState({ ...g, met: true }, g.target ? 'lead' : 'idle')
      break

    case 'lead': {
      if (!g.target) {
        g = toState(g, 'idle')
        break
      }
      if (d > GUIDE.startWaitDist) {
        g = toState(g, 'wait')
        break
      }
      const speed = Math.min(SPEED_CAP, Math.max(MIN_LEAD_PACE, ctx.playerSpeed + (DESIRED_AHEAD - d) * 2))
      const r = advance(g, speed * dt)
      g = r.done ? toState(r.g, 'present') : r.g
      break
    }

    case 'wait':
      g.facing = faceToward(g.pos, ctx.playerPos, g.facing)
      if (d <= GUIDE.greetDist) {
        g = toState(g, 'greet')
        events.push('greet')
      } else if (d < GUIDE.resumeLeadDist) {
        g = toState(g, 'lead')
      } else if (g.timer >= GUIDE.waitDialogueS && !g.waitEmitted) {
        g.waitEmitted = true
        events.push('wait')
      }
      break

    case 'present':
      g.facing = faceToward(g.pos, ctx.playerPos, g.facing)
      if (!g.target) g = toState(g, 'idle')
      else if (ctx.playerEnteredZone === g.target) g = toState(g, 'arrive')
      break

    case 'arrive':
      g.facing = faceToward(g.pos, ctx.playerPos, g.facing)
      if (g.timer >= GUIDE.arriveS) {
        g = toState(g, 'idle')
        events.push('idle')
      }
      break

    case 'idle': {
      const side = d > 1e-6 ? v.normalize(v.sub(g.pos, ctx.playerPos)) : v.fromAngle(g.facing + Math.PI / 2)
      const spot = v.add(ctx.playerPos, v.scale(side, GUIDE.idleOffset))
      const gap = v.dist(g.pos, spot)
      const stepLen = Math.min(gap, SPEED_CAP * dt)
      if (gap > 1e-6) g.pos = v.lerp(g.pos, spot, stepLen / gap)
      g.facing = faceToward(g.pos, ctx.playerPos, g.facing)
      break
    }
  }

  const hop = g.name === 'greet' ? Math.sin(Math.PI * Math.min(1, g.timer / GUIDE.greetS)) : g.name === 'arrive' ? Math.sin(Math.PI * Math.min(1, g.timer / GUIDE.arriveS)) : 0
  const pose: GuidePose = {
    position: g.pos,
    height: GUIDE.hover + hop * 0.4,
    facing: g.facing,
    state: g.name,
    squash: hop,
    glow: 0.3 + 0.7 * g.speakPulse,
    beckon: g.name === 'wait' || g.name === 'present' ? 1 : 0,
    speakPulse: g.speakPulse,
  }
  return { guide: g, pose, events }
}
