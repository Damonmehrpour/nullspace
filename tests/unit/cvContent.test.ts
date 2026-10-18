import { describe, expect, it } from 'vitest'
import { cv } from '../../src/content/cv'
import { confirmed, SAMPLE_MARKER, SECTION_IDS } from '../../src/content/schema'
import { validateContent } from '../../src/content/validateContent'

describe('launch content', () => {
  it('validates', () => {
    expect(validateContent(cv, SECTION_IDS)).toEqual([])
  })

  it('project 01 is partial with only confirmed facts', () => {
    const p = cv.projects.projects[0]
    expect(p.id).toBe('project-01')
    expect(p.status).toBe('partial')
    expect(p.name).toEqual(confirmed('XR Meditation System'))
    expect(p.context).toEqual(confirmed('Developed with a team at the University of Oulu, OASIS department'))
    for (const f of [p.summary, p.role, p.tech]) expect(f.state).toBe('pending')
    expect(p.media).toEqual([expect.objectContaining({ kind: 'youtube', src: { state: 'pending', note: 'video coming soon' } })])
    expect(p.links).toEqual([])
    expect(p.appearance).toBe('featured')
  })

  it('project 02 is pending-content and technical', () => {
    const p = cv.projects.projects[1]
    expect(p.status).toBe('pending-content')
    expect(p.appearance).toBe('technical')
    for (const f of [p.name, p.summary, p.role, p.tech]) expect(f.state).toBe('pending')
  })

  it('project 03 is a clearly marked placeholder', () => {
    const p = cv.projects.projects[2]
    expect(p.status).toBe('placeholder')
    expect(p.appearance).toBe('experimental')
    expect(p.name.state === 'confirmed' && p.name.value.startsWith(SAMPLE_MARKER)).toBe(true)
    expect(p.media).toEqual([])
  })

  it('all non-project sections are pending-content and the résumé is pending', () => {
    for (const s of [cv.education, cv.experience, cv.skills, cv.contact]) expect(s.status).toBe('pending-content')
    expect(cv.contact.resumePdf.state).toBe('pending')
    expect(cv.contact.channels.some((c) => c.kind === 'email' && c.value.state === 'pending')).toBe(true)
  })
})
