import type { SectionId } from '../content/schema'
import { REVEAL } from './config'
import { v, type Vec2 } from './geometry'

/** How long an island's reveal runs before its panel opens. */
export function revealDurationMs(id: SectionId, revealPlayed: ReadonlySet<SectionId>, reducedMotion: boolean): number {
  if (revealPlayed.has(id)) return REVEAL.revisitMs
  return reducedMotion ? REVEAL.reducedMs : REVEAL.firstMs
}

/** Index of the nearest artifact slot within range of the player, or null. */
export function artifactInRange(playerPos: Vec2, slots: Vec2[], range = 1.5): number | null {
  let best: number | null = null
  let bestD = range
  slots.forEach((s, i) => {
    const d = v.dist(playerPos, s)
    if (d <= bestD) {
      best = i
      bestD = d
    }
  })
  return best
}
