import type { SkillGroup } from '../../content/schema'

export type DistrictStyle = 'game' | 'xr' | 'ai' | 'tools' | 'languages'
export type District = { label: string; style: DistrictStyle; items: string[]; skyline: boolean }

/**
 * The Skills island's districts, one per CV skill group, straight from the content: same labels, same
 * skills in the same order. The three main areas become the skyline; the other groups are low
 * supporting districts. Groups whose items are still pending are left out.
 */
export function skillDistricts(groups: SkillGroup[]): District[] {
  return groups.flatMap((g) => {
    if (g.items.state !== 'confirmed') return []
    const area = g.areas?.[0]
    const style: DistrictStyle = area === 'game' ? 'game' : area === 'xr' ? 'xr' : area === 'ai-hci' ? 'ai' : /language/i.test(g.label) ? 'languages' : 'tools'
    return [{ label: g.label, style, items: g.items.value, skyline: area !== undefined }]
  })
}

/** "English (C1, IELTS Academic 7.0)" → name "English", detail "C1, IELTS Academic 7.0"; no brackets → name only. */
export function splitLanguage(item: string): { name: string; detail: string | null } {
  const m = /^(.*?)\s*\((.*)\)\s*$/.exec(item)
  return m ? { name: m[1], detail: m[2] } : { name: item, detail: null }
}
