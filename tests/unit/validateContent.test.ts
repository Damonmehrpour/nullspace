import { describe, expect, it } from 'vitest'
import { confirmed, pending, SAMPLE_MARKER, SECTION_IDS, type CV, type Project } from '../../src/content/schema'
import { validateContent, type ContentRule } from '../../src/content/validateContent'

function project(id: Project['id'], appearance: Project['appearance']): Project {
  return {
    id,
    status: 'pending-content',
    name: pending(),
    summary: pending(),
    role: pending(),
    tech: pending(),
    media: [],
    links: [],
    appearance,
  }
}

function validCV(): CV {
  return {
    education: { id: 'education', status: 'pending-content', title: 'Education', entries: [{ institution: pending(), degree: pending(), dates: pending() }] },
    experience: { id: 'experience', status: 'pending-content', title: 'Experience', entries: [{ org: pending(), role: pending(), dates: pending(), highlights: pending() }] },
    projects: {
      id: 'projects',
      status: 'partial',
      title: 'Projects',
      projects: [
        { ...project('project-01', 'featured'), status: 'partial', name: confirmed('Real Project'), media: [{ kind: 'youtube', src: pending('video coming soon'), alt: 'Gameplay video' }] },
        project('project-02', 'technical'),
        { ...project('project-03', 'experimental'), status: 'placeholder', name: confirmed(`${SAMPLE_MARKER}Prototype`), summary: confirmed(`${SAMPLE_MARKER}A sample.`), role: confirmed(`${SAMPLE_MARKER}Role`), tech: confirmed([`${SAMPLE_MARKER}Engine`]) },
      ],
    },
    skills: { id: 'skills', status: 'pending-content', title: 'Skills', groups: [{ label: 'Skills', items: pending() }] },
    contact: { id: 'contact', status: 'pending-content', title: 'Contact', channels: [{ kind: 'email', label: 'Email', value: pending() }], resumePdf: pending() },
  }
}

const rules = (cv: CV, ids: readonly (typeof SECTION_IDS)[number][] = SECTION_IDS): ContentRule[] =>
  validateContent(cv, ids).map((i) => i.rule)

describe('validateContent', () => {
  it('accepts the valid fixture', () => {
    expect(validateContent(validCV(), SECTION_IDS)).toEqual([])
  })

  it('flags an empty confirmed string with its path', () => {
    const cv = validCV()
    cv.projects.projects[0].name = confirmed('')
    const issues = validateContent(cv, SECTION_IDS)
    expect(issues).toContainEqual(expect.objectContaining({ rule: 'empty-confirmed', path: 'projects.projects[0].name' }))
  })

  it('flags an empty confirmed array', () => {
    const cv = validCV()
    cv.projects.projects[0].tech = confirmed([])
    expect(rules(cv)).toContain('empty-confirmed')
  })

  it('flags a real item with a pending field', () => {
    const cv = validCV()
    cv.projects.projects[0].status = 'real'
    expect(rules(cv)).toContain('real-has-pending')
  })

  it('flags a pending-content item with a confirmed field', () => {
    const cv = validCV()
    cv.projects.projects[1].name = confirmed('Something')
    expect(rules(cv)).toContain('pending-content-has-confirmed')
  })

  it('flags placeholder text without the sample marker', () => {
    const cv = validCV()
    cv.projects.projects[2].summary = confirmed('Looks real but is fake')
    expect(rules(cv)).toContain('sample-marker-missing')
  })

  it('flags the sample marker inside a partial or real item', () => {
    const cv = validCV()
    cv.projects.projects[0].summary = confirmed(`${SAMPLE_MARKER}leaked`)
    expect(rules(cv)).toContain('sample-marker-leak')
  })

  it('flags media with empty alt', () => {
    const cv = validCV()
    cv.projects.projects[0].media[0].alt = ''
    expect(rules(cv)).toContain('missing-alt')
  })

  it('flags a confirmed http:// link', () => {
    const cv = validCV()
    cv.projects.projects[0].links = [{ kind: 'github', label: 'Repo', url: confirmed('http://example.com') }]
    expect(rules(cv)).toContain('bad-url')
  })

  it('flags an email channel url that is not mailto', () => {
    const cv = validCV()
    cv.contact.status = 'partial'
    cv.contact.channels[0].value = confirmed('me@example.com')
    cv.contact.channels[0].url = confirmed('https://example.com')
    expect(rules(cv)).toContain('bad-url')
  })

  it('accepts a mailto email channel url', () => {
    const cv = validCV()
    cv.contact.status = 'partial'
    cv.contact.channels[0].value = confirmed('me@example.com')
    cv.contact.channels[0].url = confirmed('mailto:me@example.com')
    expect(rules(cv)).toEqual([])
  })

  it('flags a section id missing from the world', () => {
    expect(rules(validCV(), ['education'])).toContain('section-world-mismatch')
  })
})
