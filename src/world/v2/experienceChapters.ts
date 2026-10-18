import type { ExperienceEntry } from '../../content/schema'

export type PortalStyle = 'medrick' | 'ubicomp' | 'oasis' | 'arvo' | 'generic'

export type Chapter = {
  /** Short engraved name: the organisation up to its first qualifier ("OASIS, University of Oulu" → "OASIS"). */
  name: string
  role: string
  dates: string
  minor: boolean
  style: PortalStyle
  /** Months since year 0 of the start date, for ordering. */
  start: number
}

const STYLES: Record<string, PortalStyle> = { medrick: 'medrick', ubicomp: 'ubicomp', oasis: 'oasis', arvo: 'arvo' }

function startMonth(dates: string): number {
  const m = /(\d{1,2})\/(\d{4})/.exec(dates)
  return m ? Number(m[2]) * 12 + Number(m[1]) : Number.MAX_SAFE_INTEGER
}

/**
 * The Experience island's portals, oldest first, straight from the CV (nothing retyped by hand).
 * Entries with any pending field are left out rather than engraved with placeholders.
 */
export function experienceChapters(entries: ExperienceEntry[]): Chapter[] {
  const out: Chapter[] = []
  for (const e of entries) {
    if (e.org.state !== 'confirmed' || e.role.state !== 'confirmed' || e.dates.state !== 'confirmed') continue
    const name = e.org.value.split(/ – | - |, | \(/)[0].trim()
    out.push({ name, role: e.role.value, dates: e.dates.value, minor: !!e.minor, style: STYLES[name.toLowerCase()] ?? 'generic', start: startMonth(e.dates.value) })
  }
  return out.sort((a, b) => a.start - b.start)
}
