// The single source of truth for the world's layout. Walkable area, route graph, island meshes
// and validation are all derived from this — nothing is placed by hand twice.
import { v, type Vec2 } from '../core/geometry'
import { SECTION_IDS, type SectionId } from './schema'

export type IslandDef = {
  id: SectionId
  centre: Vec2
  radius: number
  arrivalPoint: Vec2
  arrivalZoneRadius: number
  titleAnchor: Vec2
  /** Exactly 3 for projects, empty otherwise. */
  artifactSlots: Vec2[]
}

export type WalkwayDef = { id: string; from: SectionId; to: SectionId; a: Vec2; b: Vec2; halfWidth: number }

export type WorldLayout = {
  spawn: { pos: Vec2; facing: number }
  monolith: { centre: Vec2; plinthRadius: number; slit: Vec2 }
  islands: IslandDef[]
  walkways: WalkwayDef[]
  bridge: { a: Vec2; b: Vec2; halfWidth: number }
  ringEntry: Vec2
  tourOrder: SectionId[]
}

export type LayoutParams = {
  ringRadius: number
  islandRadius: number
  plinthRadius: number
  walkwayHalfWidth: number
  bridgeHalfWidth: number
  arrivalZoneRadius: number
  /** How far walkway/bridge ends reach into the shape they join, so strips overlap. */
  joinInset: number
}

export const DEFAULT_LAYOUT_PARAMS: LayoutParams = {
  ringRadius: 22,
  islandRadius: 6,
  plinthRadius: 5,
  walkwayHalfWidth: 1,
  bridgeHalfWidth: 1.25,
  arrivalZoneRadius: 1.25,
  joinInset: 0.5,
}

const deg = (d: number) => (d * Math.PI) / 180

export function buildLayout(overrides: Partial<LayoutParams> = {}): WorldLayout {
  const p = { ...DEFAULT_LAYOUT_PARAMS, ...overrides }
  const origin = { x: 0, z: 0 }
  const tourOrder = [...SECTION_IDS]

  const islands: IslandDef[] = tourOrder.map((id, i) => {
    const outward = v.fromAngle(deg(90 - i * 72))
    const centre = v.scale(outward, p.ringRadius)
    const artifactSlots =
      id === 'projects' ? [-40, 0, 40].map((off) => v.add(centre, v.scale(v.fromAngle(v.angleOf(outward) + deg(off)), 3))) : []
    return {
      id,
      centre,
      radius: p.islandRadius,
      arrivalPoint: v.sub(centre, v.scale(outward, 2)),
      arrivalZoneRadius: p.arrivalZoneRadius,
      titleAnchor: v.add(centre, v.scale(outward, p.islandRadius + 0.5)),
      artifactSlots,
    }
  })

  const edge = p.islandRadius - p.joinInset
  const walkways: WalkwayDef[] = islands.map((from, i) => {
    const to = islands[(i + 1) % islands.length]
    const dir = v.normalize(v.sub(to.centre, from.centre))
    return {
      id: `${from.id}-${to.id}`,
      from: from.id,
      to: to.id,
      a: v.add(from.centre, v.scale(dir, edge)),
      b: v.sub(to.centre, v.scale(dir, edge)),
      halfWidth: p.walkwayHalfWidth,
    }
  })

  const entryWalk = walkways.find((w) => w.from === 'contact' && w.to === 'education')!
  const ringEntry = v.lerp(entryWalk.a, entryWalk.b, 0.5)
  const towardEntry = v.normalize(ringEntry)

  return {
    spawn: { pos: v.scale(towardEntry, 2), facing: v.angleOf(towardEntry) },
    monolith: { centre: origin, plinthRadius: p.plinthRadius, slit: origin },
    islands,
    walkways,
    bridge: { a: v.scale(towardEntry, p.plinthRadius - p.joinInset), b: ringEntry, halfWidth: p.bridgeHalfWidth },
    ringEntry,
    tourOrder,
  }
}

export const WORLD: WorldLayout = buildLayout()
