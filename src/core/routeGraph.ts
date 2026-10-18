import type { SectionId } from '../content/schema'
import type { WorldLayout } from '../content/world'
import { v, type Vec2 } from './geometry'

export type RouteNode = {
  id: string
  pos: Vec2
  kind: 'spawn' | 'bridge' | 'ring-entry' | 'walkway' | 'arrival'
  sectionId?: SectionId
}
export type RouteGraph = { nodes: Map<string, RouteNode>; adj: Map<string, string[]> }

export const arrivalNodeId = (id: SectionId) => `arrival:${id}`

/** Hand-structured waypoint graph derived from the layout (about 20 nodes). */
export function buildRouteGraph(layout: WorldLayout): RouteGraph {
  const nodes = new Map<string, RouteNode>()
  const adj = new Map<string, string[]>()
  const add = (n: RouteNode) => {
    nodes.set(n.id, n)
    adj.set(n.id, [])
  }
  const link = (a: string, b: string) => {
    adj.get(a)!.push(b)
    adj.get(b)!.push(a)
  }

  add({ id: 'spawn', pos: layout.spawn.pos, kind: 'spawn' })
  add({ id: 'bridge:mid', pos: v.lerp(layout.bridge.a, layout.bridge.b, 0.5), kind: 'bridge' })
  add({ id: 'ring-entry', pos: layout.ringEntry, kind: 'ring-entry' })
  link('spawn', 'bridge:mid')
  link('bridge:mid', 'ring-entry')

  for (const i of layout.islands) add({ id: arrivalNodeId(i.id), pos: i.arrivalPoint, kind: 'arrival', sectionId: i.id })

  for (const w of layout.walkways) {
    const a = `walkway:${w.id}:a`
    const b = `walkway:${w.id}:b`
    add({ id: a, pos: w.a, kind: 'walkway' })
    add({ id: b, pos: w.b, kind: 'walkway' })
    const midPos = v.lerp(w.a, w.b, 0.5)
    let mid = `walkway:${w.id}:mid`
    if (v.dist(midPos, layout.ringEntry) < 1e-6) mid = 'ring-entry'
    else add({ id: mid, pos: midPos, kind: 'walkway' })
    link(a, mid)
    link(mid, b)
    link(arrivalNodeId(w.from), a)
    link(b, arrivalNodeId(w.to))
  }

  return { nodes, adj }
}

export function nearestNode(g: RouteGraph, p: Vec2): string {
  let best = ''
  let bestD = Infinity
  for (const n of g.nodes.values()) {
    const d = v.dist(n.pos, p)
    if (d < bestD) {
      best = n.id
      bestD = d
    }
  }
  return best
}

/** Dijkstra by edge length. Returns node positions from → to inclusive, or [] if unreachable. */
export function shortestPath(g: RouteGraph, from: string, to: string): Vec2[] {
  const dist = new Map<string, number>([[from, 0]])
  const prev = new Map<string, string>()
  const open = new Set<string>([from])
  const done = new Set<string>()
  while (open.size > 0) {
    let cur = ''
    let curD = Infinity
    for (const id of open) {
      const d = dist.get(id)!
      if (d < curD) {
        cur = id
        curD = d
      }
    }
    open.delete(cur)
    done.add(cur)
    if (cur === to) break
    for (const nb of g.adj.get(cur) ?? []) {
      if (done.has(nb)) continue
      const nd = curD + v.dist(g.nodes.get(cur)!.pos, g.nodes.get(nb)!.pos)
      if (nd < (dist.get(nb) ?? Infinity)) {
        dist.set(nb, nd)
        prev.set(nb, cur)
        open.add(nb)
      }
    }
  }
  if (!dist.has(to)) return []
  const ids = [to]
  while (ids[0] !== from) ids.unshift(prev.get(ids[0])!)
  return ids.map((id) => g.nodes.get(id)!.pos)
}
