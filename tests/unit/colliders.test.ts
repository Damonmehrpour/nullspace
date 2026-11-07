import { describe, expect, it } from 'vitest'
import { cv } from '../../src/content/cv'
import { WORLD } from '../../src/content/world'
import { v, type Vec2 } from '../../src/core/geometry'
import { buildRouteGraph } from '../../src/core/routeGraph'
import { createWalkable } from '../../src/core/walkable'
import { worldColliders } from '../../src/world/v2/colliders'
import { contactStones } from '../../src/world/v2/contactSignal'
import { stonePlaces } from '../../src/world/v2/contactLayout'
import { experienceChapters } from '../../src/world/v2/experienceChapters'
import { STUDIO, studioPoint, studioSpan, threshold } from '../../src/world/v2/experienceLayout'
import { ACADEMY } from '../../src/world/v2/educationLayout'
import { skillDistricts } from '../../src/world/v2/skillDistricts'
import { signSpot } from '../../src/world/v2/skillsCity'

const walk = createWalkable(WORLD, worldColliders(WORLD))
const island = (id: string) => WORLD.islands.find((i) => i.id === id)!
const toWorld = (id: string, p: Vec2): Vec2 => {
  const i = island(id)
  const a = v.angleOf(i.centre)
  return { x: i.centre.x + p.x * Math.cos(a) - p.z * Math.sin(a), z: i.centre.z + p.x * Math.sin(a) + p.z * Math.cos(a) }
}

// Every spot the body can reach from spawn, on a 10 cm grid (steps well under the sweep's substep).
const STEP = 0.1
const key = (gx: number, gz: number) => `${gx},${gz}`
const reach = (() => {
  const seen = new Set<string>()
  const start = { gx: Math.round(WORLD.spawn.pos.x / STEP), gz: Math.round(WORLD.spawn.pos.z / STEP) }
  const queue = [start]
  seen.add(key(start.gx, start.gz))
  while (queue.length > 0) {
    const { gx, gz } = queue.pop()!
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const n = { gx: gx + dx, gz: gz + dz }
      const k = key(n.gx, n.gz)
      if (seen.has(k) || !walk.free({ x: n.gx * STEP, z: n.gz * STEP })) continue
      seen.add(k)
      queue.push(n)
    }
  }
  return seen
})()
/** Whether some reachable spot lies within `range` of p. */
const reachableNear = (p: Vec2, range: number) => {
  for (let gx = Math.floor((p.x - range) / STEP); gx <= Math.ceil((p.x + range) / STEP); gx++)
    for (let gz = Math.floor((p.z - range) / STEP); gz <= Math.ceil((p.z + range) / STEP); gz++)
      if (reach.has(key(gx, gz)) && Math.hypot(gx * STEP - p.x, gz * STEP - p.z) <= range) return true
  return false
}

describe('world colliders', () => {
  it('leave the spawn point and every arrival point clear', () => {
    expect(walk.free(WORLD.spawn.pos)).toBe(true)
    for (const i of WORLD.islands) expect(walk.free(i.arrivalPoint), i.id).toBe(true)
  })

  it('leave every "Guide me there" route clear, so the autopilot never walks into a wall', () => {
    const g = buildRouteGraph(WORLD)
    for (const [a, list] of g.adj)
      for (const b of list) {
        const pa = g.nodes.get(a)!.pos
        const pb = g.nodes.get(b)!.pos
        const n = Math.ceil(v.dist(pa, pb) / 0.05)
        for (let k = 0; k <= n; k++) expect(walk.free(v.lerp(pa, pb, k / n)), `${a} → ${b}`).toBe(true)
      }
  })

  it('keep every island reachable from spawn', () => {
    for (const i of WORLD.islands) expect(reachableNear(i.arrivalPoint, 0.1), i.id).toBe(true)
  })

  it('keep every interaction within reach: artifacts, district plaques and contact stones', () => {
    island('projects').artifactSlots.forEach((s, k) => expect(reachableNear(s, 1.5), `artifact ${k}`).toBe(true))
    for (const d of skillDistricts(cv.skills.groups)) expect(reachableNear(toWorld('skills', signSpot(d.style)), 2.4), d.label).toBe(true)
    stonePlaces(contactStones(cv.contact.channels).length).forEach((s, k) => expect(reachableNear(toWorld('contact', s), 1.8), `stone ${k}`).toBe(true))
  })

  it('let the player walk through every Experience gate, from the arrival ring to the far edge', () => {
    for (let x = -2.4; x <= 6.7; x += 0.05) expect(walk.free(toWorld('experience', { x, z: 0 })), `x = ${x.toFixed(2)}`).toBe(true)
    for (const c of experienceChapters(cv.experience.entries)) if (!c.minor && c.style !== 'generic') expect(reachableNear(toWorld('experience', threshold(c.style).o), 0.1), c.style).toBe(true)
  })

  it('let the player step into the Sämmi Studios doorway, past its threshold, but not through its walls', () => {
    const { hall, door } = STUDIO
    const dv = (door.v0 + door.v1) / 2
    // From well in front of the studio up to the back of the doorway recess, less the body's radius.
    for (let u = 1.9; u >= hall.u1 - door.depth + 0.32; u -= 0.05) expect(walk.free(toWorld('experience', studioPoint(u, dv))), `u = ${u.toFixed(2)}`).toBe(true)
    expect(reachableNear(toWorld('experience', studioPoint(hall.u1 - 0.2, dv)), 0.1)).toBe(true)
    expect(walk.free(toWorld('experience', studioPoint(-0.4, STUDIO.loft.slit)))).toBe(false) // the loft
    expect(walk.free(toWorld('experience', studioPoint(0, STUDIO.window.v0)))).toBe(false) // the hall
  })

  it('keep the studio clear of the corridor gates and inside the island', () => {
    const { hall, plinth } = STUDIO
    const [lo, hi] = studioSpan()
    const corners = [
      [hall.u0 - plinth, lo - plinth],
      [hall.u1 + plinth, lo - plinth],
      [hall.u1 + plinth, hi + plinth],
      [hall.u0 - plinth, hi + plinth],
    ].map(([u, vv]) => studioPoint(u, vv))
    for (const c of corners) {
      expect(Math.hypot(c.x, c.z), 'inside the island').toBeLessThan(island('experience').radius - 0.4)
      // Every gate stands within |z| ≤ 1.85 of the corridor's axis: keep a walkable gap beside them.
      expect(c.z, 'beside the corridor').toBeLessThan(-1.85 - 0.9)
    }
  })

  it('keep the academy on its podium, clear of the arrival ring and inside the island', () => {
    const { podium, stacks } = ACADEMY
    const x0 = ACADEMY.shift + podium.x0
    expect(walk.free(toWorld('education', { x: x0 - 0.35, z: 0 }))).toBe(true)
    expect(walk.free(toWorld('education', { x: x0 + 0.05, z: 0 }))).toBe(false)
    expect(Math.hypot(ACADEMY.shift + podium.x1, stacks.z1)).toBeLessThan(island('education').radius - 0.5)
    expect(x0 - 0.3 - (-2.4 + 1.25)).toBeGreaterThan(1.2) // the arrival ring (at x = -2.4, r 1.25) stays open
  })

  it('make the Data City towers, the archive and the monolith solid', () => {
    expect(walk.free(WORLD.monolith.centre)).toBe(false)
    expect(walk.free(toWorld('education', { x: 3, z: 0 }))).toBe(false)
    expect(walk.free(toWorld('skills', { x: 4.75 * Math.cos((-62 * Math.PI) / 180), z: 4.75 * Math.sin((-62 * Math.PI) / 180) }))).toBe(false)
    expect(walk.free(toWorld('contact', { x: 2.4, z: 0 }))).toBe(false)
  })
})
