import { describe, expect, it } from 'vitest'
import { cv } from '../../src/content/cv'
import { experienceChapters } from '../../src/world/v2/experienceChapters'

describe('experience chapters (portal data)', () => {
  const chapters = experienceChapters(cv.experience.entries)

  it('orders the four career chapters oldest to newest, one portal each', () => {
    const portals = chapters.filter((c) => !c.minor)
    expect(portals.map((c) => c.name)).toEqual(['Medrick', 'Ubicomp', 'OASIS', 'ARVO'])
    expect(portals.map((c) => c.style)).toEqual(['medrick', 'ubicomp', 'oasis', 'arvo'])
  })

  it('engraves roles and dates exactly as the CV states them', () => {
    const byName = Object.fromEntries(chapters.map((c) => [c.name, c]))
    expect(byName.ARVO).toMatchObject({ role: 'Lead XR Engineer', dates: '08/2025 – 11/2025' })
    expect(byName.OASIS).toMatchObject({ role: 'Project Worker / Unreal Developer', dates: '11/2024 – 03/2025' })
    expect(byName.Ubicomp).toMatchObject({ role: 'Research Assistant / Unreal Developer', dates: '05/2024 – 08/2024' })
    expect(byName.Medrick).toMatchObject({ role: 'Game Developer', dates: '08/2020 – 12/2021' })
  })

  it('keeps the minor tutoring chapter, in its place in time, as a minor marker', () => {
    const minor = chapters.filter((c) => c.minor)
    expect(minor).toHaveLength(1)
    expect(minor[0]).toMatchObject({ role: 'Tutor', dates: '12/2021 – 12/2023' })
    expect(chapters.indexOf(minor[0])).toBe(1) // between Medrick and Ubicomp
  })

  it('skips fields that are still pending instead of engraving placeholders', () => {
    const out = experienceChapters([{ org: { state: 'pending' }, role: { state: 'confirmed', value: 'X' }, dates: { state: 'confirmed', value: '01/2020 – 02/2020' }, highlights: { state: 'pending' } }])
    expect(out).toEqual([])
  })
})
