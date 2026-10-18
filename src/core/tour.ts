import type { SectionId } from '../content/schema'
import type { IslandDef } from '../content/world'
import { TOUR } from './config'
import { v, type Vec2 } from './geometry'

/** Next island to guide to. Only physical world visits count — content viewed elsewhere never does. */
export function nextTarget(order: readonly SectionId[], worldVisited: ReadonlySet<SectionId>): SectionId | null {
  return order.find((id) => !worldVisited.has(id)) ?? null
}

export function isTourComplete(order: readonly SectionId[], worldVisited: ReadonlySet<SectionId>): boolean {
  return order.every((id) => worldVisited.has(id))
}

/** `armed` zones may fire on their next entry; a zone disarms on entry and re-arms once well outside. */
export type ZoneTracker = { inside: SectionId | null; armed: Set<SectionId> }

export function createZoneTracker(ids: readonly SectionId[]): ZoneTracker {
  return { inside: null, armed: new Set(ids) }
}

export function updateZones(t: ZoneTracker, playerPos: Vec2, islands: IslandDef[]): { tracker: ZoneTracker; entered: SectionId | null } {
  const armed = new Set(t.armed)
  let inside: SectionId | null = null
  let entered: SectionId | null = null
  for (const i of islands) {
    const d = v.dist(playerPos, i.arrivalPoint)
    if (d <= i.arrivalZoneRadius) {
      inside = i.id
      if (armed.has(i.id)) {
        armed.delete(i.id)
        entered = i.id
      }
    } else if (d > i.arrivalZoneRadius + TOUR.rearmMargin) {
      armed.add(i.id)
    }
  }
  return { tracker: { inside, armed }, entered }
}
