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
