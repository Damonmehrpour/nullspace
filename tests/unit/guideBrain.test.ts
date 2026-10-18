import { describe, expect, it } from 'vitest'
import type { SectionId } from '../../src/content/schema'
import { WORLD } from '../../src/content/world'
import { v, type Vec2 } from '../../src/core/geometry'
import { createGuide, pulseSpeak, stepGuide, type GuideEvent, type GuideState } from '../../src/core/guideBrain'
import { arrivalNodeId, buildRouteGraph, shortestPath } from '../../src/core/routeGraph'
import { createWalkable } from '../../src/core/walkable'

const graph = buildRouteGraph(WORLD)
const walk = createWalkable(WORLD)
const DT = 1 / 60
const route = shortestPath(graph, 'spawn', arrivalNodeId('education'))

function pointAlong(path: Vec2[], s: number): Vec2 {
  let left = s
  for (let i = 0; i < path.length - 1; i++) {
    const seg = v.dist(path[i], path[i + 1])
    if (left <= seg) return v.lerp(path[i], path[i + 1], left / seg)
    left -= seg
  }
  return path[path.length - 1]
}

type Ctx = { playerPos: Vec2; playerSpeed?: number; target?: SectionId | null; entered?: SectionId | null; dt?: number }

function step(g: GuideState, c: Ctx) {
  return stepGuide(g, {
    graph,
    playerPos: c.playerPos,
    playerSpeed: c.playerSpeed ?? 0,
    target: c.target === undefined ? 'education' : c.target,
    playerEnteredZone: c.entered ?? null,
    dt: c.dt ?? DT,
  })
}

function hold(g: GuideState, seconds: number, c: Ctx) {
  const events: GuideEvent[] = []
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    const r = step(g, c)
    g = r.guide
    events.push(...r.events)
  }
  return { g, events }
}

/** Starts a guide that has finished its first greeting and is leading towards Education. */
function leading(): GuideState {
  return hold(createGuide(WORLD), 0.6, { playerPos: WORLD.spawn.pos }).g
}

describe('first meeting', () => {
  it('emits firstMeet once and then leads to Education', () => {
    const g0 = createGuide(WORLD)
    expect(g0.name).toBe('greet')
    const first = step(g0, { playerPos: WORLD.spawn.pos })
    expect(first.events).toEqual(['firstMeet'])
    const { g, events } = hold(first.guide, 0.5, { playerPos: WORLD.spawn.pos })
    expect(events).toEqual([])
    expect(g.name).toBe('lead')
    expect(g.target).toBe('education')
  })
})

describe('leading', () => {
  it('keeps 2–3 m ahead of a player following at walking speed', () => {
    // The player lets the guide set off first, then follows the same route.
    let g = hold(leading(), 2, { playerPos: WORLD.spawn.pos }).g
    const distances: number[] = []
    for (let i = 0; i < 60 * 5; i++) {
      const playerPos = pointAlong(route, 4 * i * DT)
      g = step(g, { playerPos, playerSpeed: 4 }).guide
      if (i > 90 && g.name === 'lead') distances.push(v.dist(g.pos, playerPos))
    }
    expect(distances.length).toBeGreaterThan(60)
    expect(Math.min(...distances)).toBeGreaterThanOrEqual(1.7)
    expect(Math.max(...distances)).toBeLessThanOrEqual(3.3)
  })

  it('waits when the player falls more than 7 m behind, without flickering in the 5–7 m gap', () => {
    let g = leading()
    g = hold(g, 6, { playerPos: WORLD.spawn.pos }).g
    expect(g.name).toBe('wait')
    g = hold(g, 0.5, { playerPos: v.add(g.pos, v.scale(v.sub(WORLD.spawn.pos, g.pos), 6 / v.dist(WORLD.spawn.pos, g.pos))) }).g
    expect(g.name).toBe('wait')
    const near = v.add(g.pos, v.scale(v.normalize(v.sub(WORLD.spawn.pos, g.pos)), 4.9))
    expect(step(g, { playerPos: near }).guide.name).toBe('lead')
  })

  it('emits wait once per waiting episode after 4 s', () => {
    let g = hold(leading(), 6, { playerPos: WORLD.spawn.pos }).g
    expect(g.name).toBe('wait')
    const r = hold(g, 10, { playerPos: WORLD.spawn.pos })
    expect(r.events.filter((e) => e === 'wait')).toHaveLength(1)
  })

  it('greets a player who comes back close after a wait, then leads again', () => {
    const g = hold(leading(), 6, { playerPos: WORLD.spawn.pos }).g
    const close = v.add(g.pos, { x: 1, z: 0 })
    const r = step(g, { playerPos: close })
    expect(r.guide.name).toBe('greet')
    expect(r.events).toContain('greet')
    expect(hold(r.guide, 0.6, { playerPos: close }).g.name).toBe('lead')
  })
})

describe('destinations', () => {
  function presentAtEducation(): GuideState {
    let g = leading()
    for (let i = 0; i < 60 * 20 && g.name !== 'present'; i++) g = step(g, { playerPos: g.pos, playerSpeed: 4 }).guide
    return g
  }

  it('presents at the arrival point and never opens anything by itself', () => {
    const g = presentAtEducation()
    expect(g.name).toBe('present')
    expect(v.dist(g.pos, WORLD.islands[0].arrivalPoint)).toBeLessThan(0.05)
    const away = v.add(WORLD.islands[0].arrivalPoint, { x: 0, z: -4 })
    expect(hold(g, 60, { playerPos: away }).g.name).toBe('present')
  })

  it('arrives only when the player enters the target zone, then idles', () => {
    let g = presentAtEducation()
    expect(step(g, { playerPos: g.pos, entered: 'skills' }).guide.name).toBe('present')
    g = step(g, { playerPos: g.pos, entered: 'education' }).guide
    expect(g.name).toBe('arrive')
    expect(hold(g, 0.6, { playerPos: g.pos }).g.name).toBe('idle')
  })

  it('replans from the nearest node when the target changes, staying on walkable ground', () => {
    let g = leading()
    g = hold(g, 1, { playerPos: g.pos, playerSpeed: 4 }).g
    g = step(g, { playerPos: g.pos, target: 'skills' }).guide
    expect(g.target).toBe('skills')
    expect(g.path.at(-1)).toEqual(graph.nodes.get(arrivalNodeId('skills'))!.pos)
    for (const p of g.path) expect(walk.contains(p)).toBe(true)
  })

  it('snaps back onto the graph when displaced more than 1 m from its path', () => {
    const g = leading()
    const displaced = { ...g, pos: v.add(g.pos, { x: 0, z: 3 }) }
    const r = step(displaced, { playerPos: WORLD.spawn.pos })
    expect(walk.contains(r.guide.pos)).toBe(true)
    expect([...graph.nodes.values()].some((n) => v.dist(n.pos, r.guide.pos) < 0.5)).toBe(true)
  })

  it('idles beside the player when there is no target', () => {
    const r = hold(leading(), 4, { playerPos: WORLD.spawn.pos, target: null })
    expect(r.g.name).toBe('idle')
    const d = v.dist(r.g.pos, WORLD.spawn.pos)
    expect(d).toBeGreaterThan(1.5)
    expect(d).toBeLessThan(2.5)
  })
})

describe('robustness', () => {
  it('a 5 s frame moves at most one capped step and does not skip to present', () => {
    const g = leading()
    const r = step(g, { playerPos: g.pos, playerSpeed: 4, dt: 5 })
    expect(v.dist(r.guide.pos, g.pos)).toBeLessThanOrEqual(4 * 1.15 * 0.1 + 1e-6)
    expect(r.guide.name).toBe('lead')
  })

  it('speak pulses decay over about 0.4 s', () => {
    let g = pulseSpeak(leading())
    expect(step(g, { playerPos: g.pos }).pose.speakPulse).toBeGreaterThan(0.9)
    g = hold(g, 0.5, { playerPos: g.pos }).g
    expect(step(g, { playerPos: g.pos }).pose.speakPulse).toBe(0)
  })
})
