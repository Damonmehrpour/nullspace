import { describe, expect, it } from 'vitest'
import { cv } from '../../src/content/cv'
import { confirmed, SECTION_IDS, type Field } from '../../src/content/schema'
import { validateContent } from '../../src/content/validateContent'

const value = <T,>(f: Field<T> | undefined) => (f && f.state === 'confirmed' ? f.value : undefined)
const allText = JSON.stringify(cv)

describe('merged CV content', () => {
  it('validates', () => {
    expect(validateContent(cv, SECTION_IDS)).toEqual([])
  })

  it('presents Damon Mehrpour across three equal areas', () => {
    expect(cv.profile.name).toBe('Damon Mehrpour')
    expect(cv.profile.headline).toBe('Building worlds, systems & intelligent experiences.')
    expect(cv.profile.areas).toEqual(['game', 'xr', 'ai-hci'])
  })

  it('renames Education to Education & Research with the thesis link, publication and interests', () => {
    expect(cv.education.title).toBe('Education & Research')
    const msc = cv.education.entries[0]
    expect(value(msc.thesis?.url)).toBe('https://oulurepo.oulu.fi/handle/10024/56921')
    expect(value(cv.education.entries[1].dates)).toBe('2018–2021')
    const pub = cv.education.research!.publications[0]
    expect(value(pub.citation)).toContain('Mehrpour Moghadam, S.M., Chen, H. (2025)')
    expect(value(pub.citation)).toContain('HHAI 2025 Demo Track')
    expect(value(cv.education.research!.interests)?.length).toBeGreaterThanOrEqual(4)
  })

  it('states the Medrick work accurately: 7+ projects, four released', () => {
    const medrick = cv.experience.entries.find((e) => value(e.org)?.startsWith('Medrick'))!
    expect(value(medrick.highlights)?.join(' ')).toContain('7+ mobile game projects, four of which reached release')
    expect(allText).not.toMatch(/shipped more than seven|7\+ shipped|seven shipped/i)
  })

  it('includes the tutor role as a minor entry', () => {
    const tutor = cv.experience.entries.find((e) => value(e.role) === 'Tutor')!
    expect(tutor.minor).toBe(true)
    expect(value(tutor.dates)).toBe('12/2021 – 12/2023')
  })

  it('projects represent XR, AI/HCI and game development', () => {
    const [p1, p2, p3] = cv.projects.projects
    expect(p1.name).toEqual(confirmed('XR Meditation System'))
    expect(p1.areas).toContain('xr')
    expect(p1.links).toContainEqual(expect.objectContaining({ label: 'Watch demo', url: confirmed('https://youtu.be/lvPXvY1qMxk') }))
    expect(p2.areas).toContain('ai-hci')
    expect(p2.tech.state).toBe('pending')
    expect(p3.areas).toContain('game')
    expect(p3.media.map((m) => m.caption?.split(':')[0])).toEqual(['Monster Squish', 'Baby Musk', 'Arrow', 'Color Finch'])
    for (const m of p3.media) expect(value(m.src)).toMatch(/^\/media\/games\/[a-z-]+\.webp$/)
    expect(p3.links.find((l) => l.label === 'Gameplay video')?.url.state).toBe('pending')
  })

  it('features the three honors without unconfirmed claims', () => {
    expect(cv.projects.honors.map((h) => h.project)).toEqual(['Grand Tour XR', 'WasteGo', 'Who Are You?'])
    expect(value(cv.projects.honors[1].award)).toBe('4th place')
    expect(allText).not.toMatch(/neural network/i)
  })

  it('contact shows email, GitHub, LinkedIn and availability, but no phone and no résumé download', () => {
    const kinds = cv.contact.channels.map((c) => c.kind)
    expect(kinds).toEqual(['email', 'github', 'linkedin'])
    expect(value(cv.contact.location)).toBe('Oulu, Finland')
    expect(value(cv.contact.availability)).toBe('Open to remote work and relocation opportunities')
    expect(allText).not.toMatch(/\+358|tel:|resume|résumé\.pdf/i)
    expect('resumePdf' in cv.contact).toBe(false)
  })

  it('lists languages exactly as approved', () => {
    const langs = cv.skills.groups.find((g) => g.label === 'Languages')!
    expect(value(langs.items)).toEqual(['Persian (native)', 'English (C1, IELTS Academic 7.0)', 'Finnish (A2)', 'German (A1)'])
  })
})
