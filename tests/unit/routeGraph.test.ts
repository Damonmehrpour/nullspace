import { describe, expect, it } from 'vitest'
import { SECTION_IDS } from '../../src/content/schema'
import { WORLD } from '../../src/content/world'
import { v } from '../../src/core/geometry'
import { arrivalNodeId, buildRouteGraph, nearestNode, shortestPath } from '../../src/core/routeGraph'

const g = buildRouteGraph(WORLD)

describe('route graph', () => {
  it('has 15–25 nodes including spawn, ring entry and every arrival', () => {
    expect(g.nodes.size).toBeGreaterThanOrEqual(15)
    expect(g.nodes.size).toBeLessThanOrEqual(25)
    expect(g.nodes.has('spawn')).toBe(true)
    expect(g.nodes.has('ring-entry')).toBe(true)
    for (const id of SECTION_IDS) expect(g.nodes.has(arrivalNodeId(id))).toBe(true)
  })

  it('routes from spawn to Education through the ring entry', () => {
    const path = shortestPath(g, 'spawn', arrivalNodeId('education'))
    expect(path[0]).toEqual(g.nodes.get('spawn')!.pos)
    expect(path.at(-1)).toEqual(g.nodes.get(arrivalNodeId('education'))!.pos)
    expect(path.some((p) => v.dist(p, WORLD.ringEntry) < 1e-9)).toBe(true)
  })

  it('routes between adjacent islands around the ring, not across the monolith', () => {
    const path = shortestPath(g, arrivalNodeId('projects'), arrivalNodeId('skills'))
    for (const p of path) expect(v.len(p)).toBeGreaterThan(10)
  })

  it('connects every pair of arrival nodes', () => {
    for (const a of SECTION_IDS) for (const b of SECTION_IDS) expect(shortestPath(g, arrivalNodeId(a), arrivalNodeId(b)).length).toBeGreaterThan(0)
  })

  it('maps an island centre to that island’s arrival node', () => {
    for (const i of WORLD.islands) expect(nearestNode(g, i.centre)).toBe(arrivalNodeId(i.id))
  })

  it('returns a single point for a path to itself', () => {
    expect(shortestPath(g, 'spawn', 'spawn')).toHaveLength(1)
  })
})
