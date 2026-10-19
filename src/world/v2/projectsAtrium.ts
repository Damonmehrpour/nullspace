import type { Honor } from '../../content/schema'

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
