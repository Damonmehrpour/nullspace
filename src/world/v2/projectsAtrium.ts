import type { Honor } from '../../content/schema'
import { SPREAD } from '../../content/world'

export type Plaque = { title: string; award: string; event: string }

/**
 * Honours engraved into the Projects atrium's wall, straight from the CV. A pending year is simply
 * left off; an honour whose award is still pending isn't engraved at all.
 */
export function honorPlaques(honors: Honor[]): Plaque[] {
  return honors.flatMap((h) =>
    h.award.state === 'confirmed' ? [{ title: h.project, award: h.award.value, event: h.year?.state === 'confirmed' ? `${h.event} ${h.year.value}` : h.event }] : [],
  )
}

// The atrium's layout, shared by its meshes (ProjectsV2) and its colliders. Island-local space: +x
// points outward, angles measured from +x toward +z.
export const deg = (d: number) => (d * Math.PI) / 180
export const ARCS: [number, number][] = [
  [22, 104], // honour side
  [-104, -22],
  [146, 214], // behind the arrival ring
]
// Radii follow the island's size (SPREAD); heights and depths don't.
const K = SPREAD
export const TIERS: [number, number, number][] = [
  [4.3 * K, 5.95 * K, 0.3],
  [4.8 * K, 5.95 * K, 0.6],
  [5.3 * K, 5.95 * K, 0.9],
]
export const WALL = { a0: 50, a1: 96, r0: 5.95 * K - 0.45, r1: 5.95 * K, h: 2.2 }
export const PLAQUE_ANGLES = [59, 73, 87]
export const PLAQUE_R = 5.95 * K - 0.55
// Just above the gameplay camera's view from inside, so it frames the island from afar and its threads
// of light descend into view up close, instead of a slab filling the top of the screen.
export const RING = { r0: 3.25 * K, r1: 3.25 * K + 0.9, h: 0.5, y: 5.7, drop: 2.6 }
export const SLOT_R = 3 * K
export const SLOT_ANGLES = [-40, 0, 40] // matches the layout's artifact slots
export const PLINTH_H = 0.7
