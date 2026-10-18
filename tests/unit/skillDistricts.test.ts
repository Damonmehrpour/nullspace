import { describe, expect, it } from 'vitest'
import { cv } from '../../src/content/cv'
import { skillDistricts } from '../../src/world/v2/skillDistricts'

describe('Data City districts (Skills island)', () => {
  const districts = skillDistricts(cv.skills.groups)

  it('gives every CV skill group its own district, keeping its label and kind', () => {
    expect(districts.map((d) => [d.label, d.style])).toEqual([
      ['Game Development', 'game'],
      ['XR / Immersive', 'xr'],
      ['AI / HCI Research', 'ai'],
      ['Programming & tools', 'tools'],
      ['Languages', 'languages'],
    ])
  })

  it('keeps every skill, word for word and in order, in its own group (one tower each)', () => {
    for (const g of cv.skills.groups) {
      const d = districts.find((x) => x.label === g.label)!
      expect(g.items.state).toBe('confirmed')
      expect(d.items).toEqual(g.items.state === 'confirmed' ? g.items.value : [])
    }
    expect(districts.flatMap((d) => d.items)).toHaveLength(22)
  })

  it('marks the three main areas as skyline districts and the rest as supporting', () => {
    expect(districts.filter((d) => d.skyline).map((d) => d.style)).toEqual(['game', 'xr', 'ai'])
  })

  it('leaves out a group whose items are still pending', () => {
    expect(skillDistricts([{ label: 'X', items: { state: 'pending' } }])).toEqual([])
  })
})
