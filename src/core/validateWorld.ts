import type { SectionId } from '../content/schema'
import type { WorldLayout } from '../content/world'
import { WALK } from './config'
import { distToSegment, v, type Shape, type Vec2 } from './geometry'
import { arrivalNodeId, buildRouteGraph, shortestPath } from './routeGraph'
import { createWalkable, walkableShapes } from './walkable'

export type WorldIssue = {
  rule:
    | 'node-outside'
    | 'edge-outside'
    | 'unreachable'
    | 'zone-outside'
    | 'section-missing'
    | 'artifact-slots'
    | 'slot-outside'
    | 'substep-too-large'
  detail: string
}

const SAMPLE_STEP = 0.25

/** Points along a shape's centreline (circles: the centre only), used to measure gaps between shapes. */
function axisSamples(s: Shape): Vec2[] {
  if (s.kind === 'circle') return [s.c]
  const n = Math.max(1, Math.ceil(v.dist(s.a, s.b) / SAMPLE_STEP))
  return Array.from({ length: n + 1 }, (_, i) => v.lerp(s.a, s.b, i / n))
}

const extent = (s: Shape) => (s.kind === 'circle' ? s.r : s.halfWidth)

function distToShapeAxis(p: Vec2, s: Shape): number {
  return s.kind === 'circle' ? v.dist(p, s.c) : distToSegment(p, s.a, s.b)
}

/** Smallest positive void gap between two shapes that do not touch (Infinity when they overlap). */
function gapBetween(a: Shape, b: Shape): number {
  let min = Infinity
  for (const p of axisSamples(a)) min = Math.min(min, distToShapeAxis(p, b) - extent(a) - extent(b))
  return min > 0 ? min : Infinity
}

export function validateWorld(layout: WorldLayout, sectionIds: readonly SectionId[], maxSubstep: number = WALK.maxSubstep): WorldIssue[] {
  const issues: WorldIssue[] = []
  const walk = createWalkable(layout)
  const graph = buildRouteGraph(layout)

  for (const id of sectionIds) {
    if (!layout.islands.some((i) => i.id === id)) issues.push({ rule: 'section-missing', detail: `no island for "${id}"` })
  }

  for (const n of graph.nodes.values()) {
    if (!walk.contains(n.pos)) issues.push({ rule: 'node-outside', detail: n.id })
  }

  const seen = new Set<string>()
  for (const [a, nbs] of graph.adj) {
    for (const b of nbs) {
      const key = [a, b].sort().join('|')
      if (seen.has(key)) continue
      seen.add(key)
      const pa = graph.nodes.get(a)!.pos
      const pb = graph.nodes.get(b)!.pos
      const n = Math.max(1, Math.ceil(v.dist(pa, pb) / SAMPLE_STEP))
      for (let i = 0; i <= n; i++) {
        if (!walk.contains(v.lerp(pa, pb, i / n))) {
          issues.push({ rule: 'edge-outside', detail: key })
          break
        }
      }
    }
  }

  for (const island of layout.islands) {
    const target = arrivalNodeId(island.id)
    for (const from of graph.nodes.keys()) {
      if (shortestPath(graph, from, target).length === 0) {
        issues.push({ rule: 'unreachable', detail: `${target} from ${from}` })
        break
      }
    }
    if (v.dist(island.arrivalPoint, island.centre) + island.arrivalZoneRadius > island.radius) {
      issues.push({ rule: 'zone-outside', detail: island.id })
    }
    if (island.id === 'projects' && island.artifactSlots.length !== 3) {
      issues.push({ rule: 'artifact-slots', detail: `projects has ${island.artifactSlots.length} slots` })
    }
    for (const slot of island.artifactSlots) {
      if (v.dist(slot, island.centre) > island.radius) issues.push({ rule: 'slot-outside', detail: island.id })
    }
  }

  const shapes = walkableShapes(layout)
  const narrowest = Math.min(...shapes.map(extent))
  let smallestGap = Infinity
  for (let i = 0; i < shapes.length; i++) for (let j = i + 1; j < shapes.length; j++) smallestGap = Math.min(smallestGap, gapBetween(shapes[i], shapes[j]), gapBetween(shapes[j], shapes[i]))
  if (maxSubstep >= narrowest || maxSubstep >= smallestGap) {
    issues.push({ rule: 'substep-too-large', detail: `substep ${maxSubstep} vs narrowest ${narrowest}, smallest gap ${smallestGap.toFixed(2)}` })
  }

  return issues
}
