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
  /** One per project on the Projects island (see PROJECT_SLOTS), empty otherwise. */
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
  /** How far each arrival point sits from its island's centre, toward the monolith. */
  arrivalOffset: number
}

export const DEFAULT_LAYOUT_PARAMS: LayoutParams = {
  ringRadius: 24,
  islandRadius: 7.2,
  plinthRadius: 5.5,
  walkwayHalfWidth: 1,
  bridgeHalfWidth: 1.25,
  arrivalZoneRadius: 1.25,
  joinInset: 0.5,
  arrivalOffset: 2.4,
}

/**
 * How much roomier the islands are than the 6 m platforms their layouts were first drawn on. Island
 * layouts multiply their placement radii (not their buildings) by this, so exhibits spread apart.
 */
export const SPREAD = DEFAULT_LAYOUT_PARAMS.islandRadius / 6

const deg = (d: number) => (d * Math.PI) / 180

/**
 * The Projects island's artifact slots, in island-local polar terms (angle from outward, metres from
 * the centre), one per project in CV order: three plinths under the ring, and the SanaSauna word-game
 * exhibit on the atrium floor opposite the honour wall.
 */
export const PROJECT_SLOTS: { angle: number; r: number }[] = [
  { angle: -40, r: 3 * SPREAD },
  { angle: 0, r: 3 * SPREAD },
  { angle: 40, r: 3 * SPREAD },
  { angle: -90, r: 2.75 * SPREAD },
]

export function buildLayout(overrides: Partial<LayoutParams> = {}): WorldLayout {
  const p = { ...DEFAULT_LAYOUT_PARAMS, ...overrides }
  const origin = { x: 0, z: 0 }
  const tourOrder = [...SECTION_IDS]

  const islands: IslandDef[] = tourOrder.map((id, i) => {
    const outward = v.fromAngle(deg(90 - i * 72))
    const centre = v.scale(outward, p.ringRadius)
    const artifactSlots =
      id === 'projects' ? PROJECT_SLOTS.map((s) => v.add(centre, v.scale(v.fromAngle(v.angleOf(outward) + deg(s.angle)), s.r))) : []
    return {
      id,
      centre,
      radius: p.islandRadius,
      arrivalPoint: v.sub(centre, v.scale(outward, p.arrivalOffset)),
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
