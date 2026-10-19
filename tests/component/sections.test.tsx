import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { cv } from '../../src/content/cv'
import { confirmed, pending, type Media, type Project } from '../../src/content/schema'
import { MediaItem } from '../../src/ui/Panel/MediaItem'
import { PanelHost } from '../../src/ui/Panel/PanelHost'
import { ProjectDetail } from '../../src/ui/Panel/ProjectDetail'
import { ContactView } from '../../src/ui/Panel/sections/ContactView'
import { EducationView } from '../../src/ui/Panel/sections/EducationView'
import { ExperienceView } from '../../src/ui/Panel/sections/ExperienceView'
import { ProjectsView } from '../../src/ui/Panel/sections/ProjectsView'
import { SkillsView } from '../../src/ui/Panel/sections/SkillsView'
import { initialState, useStore } from '../../src/state/store'

beforeEach(() => useStore.setState(initialState()))

describe('section views', () => {
  it('education & research shows degrees, the linked thesis, the publication and interests', () => {
    render(<EducationView section={cv.education} />)
    expect(screen.getByText('MSc in Computer Science and Engineering')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /LLM-Driven AI Avatars: A Framework/ })).toHaveAttribute('href', 'https://oulurepo.oulu.fi/handle/10024/56921')
    expect(screen.getByText(/Meta-Cognitive 3D AI Avatar/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Research interests' })).toBeInTheDocument()
    expect(screen.getByText('2018–2021')).toBeInTheDocument()
  })

  it('experience tags areas and shows the tutor role as a minor entry', () => {
    render(<ExperienceView section={cv.experience} />)
    expect(screen.getAllByText('XR / Immersive').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Game Development').length).toBeGreaterThan(0)
    expect(screen.getByText('Tutor').closest('li')).toHaveAttribute('data-minor')
  })

  it('skills are grouped by the three areas plus tools and languages', () => {
    render(<SkillsView section={cv.skills} />)
    for (const g of ['Game Development', 'XR / Immersive', 'AI / HCI Research', 'Programming & tools', 'Languages']) expect(screen.getByText(g)).toBeInTheDocument()
    expect(screen.getByText('English (C1, IELTS Academic 7.0)')).toBeInTheDocument()
  })

  it('contact lists email, a dialable phone number, GitHub, LinkedIn and availability', () => {
    render(<ContactView section={cv.contact} />)
    expect(screen.getByRole('link', { name: 'github.com/Damonmehrpour' })).toHaveAttribute('href', 'https://github.com/Damonmehrpour')
    const phone = screen.getByRole('link', { name: '+358 45 8629910' })
    expect(phone).toHaveAttribute('href', 'tel:+358458629910')
    expect(phone).not.toHaveAttribute('target') // dials in place, no new tab
    expect(screen.getByText('Oulu, Finland')).toBeInTheDocument()
    expect(screen.getByText('Open to remote work and relocation opportunities')).toBeInTheDocument()
  })

  it('projects view lists the honors with their projects', () => {
    render(<ProjectsView section={cv.projects} source="quicknav" />)
    expect(screen.getByRole('heading', { name: 'Honors' })).toBeInTheDocument()
    for (const p of ['Grand Tour XR', 'WasteGo', 'Who Are You?']) expect(screen.getByText(p)).toBeInTheDocument()
    expect(screen.getByText('4th place', { exact: false })).toBeInTheDocument()
  })

  it('projects view lists three projects that open their detail', async () => {
    render(
      <>
        <ProjectsView section={cv.projects} source="quicknav" />
        <PanelHost />
      </>,
    )
    const cards = screen.getAllByRole('button', { name: /open project/i })
    expect(cards).toHaveLength(3)
    await userEvent.click(cards[0])
    expect(useStore.getState().panel).toEqual({ kind: 'project', id: 'project-01' })
  })
})

describe('ProjectDetail', () => {
  it('project 01 shows its confirmed details and a Watch demo link, with no embed until played', () => {
    render(<ProjectDetail project={cv.projects.projects[0]} />)
    expect(screen.queryByText('IN DOCUMENTATION')).toBeNull()
    expect(screen.getByText('Developed with a team at the University of Oulu, OASIS department')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Watch demo' })).toHaveAttribute('href', 'https://youtu.be/lvPXvY1qMxk')
    expect(document.querySelector('iframe')).toBeNull()
  })

  it('project 03 opens a captioned gallery of the four released games', () => {
    render(<ProjectDetail project={cv.projects.projects[2]} />)
    const gallery = screen.getByRole('list', { name: 'Gallery' })
    expect(within(gallery).getAllByRole('img')).toHaveLength(4)
    for (const name of ['Monster Squish', 'Baby Musk', 'Arrow', 'Color Finch']) expect(within(gallery).getByText(new RegExp('^' + name + ':'))).toBeInTheDocument()
    // No public gameplay video is known, so none is mentioned (no placeholder link).
    expect(screen.queryByText(/Gameplay video/)).toBeNull()
  })

  it('omits links whose url is unknown, label and all', () => {
    const p: Project = { ...cv.projects.projects[1], links: [{ kind: 'github', label: 'Repository', url: pending() }] }
    render(<ProjectDetail project={p} />)
    expect(screen.queryByText(/Repository/)).toBeNull()
    expect(screen.queryByText('Links')).toBeNull()
  })

  it('renders confirmed links as external anchors', () => {
    const p: Project = { ...cv.projects.projects[1], links: [{ kind: 'github', label: 'Repository', url: confirmed('https://example.com/r') }] }
    render(<ProjectDetail project={p} />)
    const a = screen.getByRole('link', { name: /repository/i })
    expect(a).toHaveAttribute('href', 'https://example.com/r')
    expect(a).toHaveAttribute('rel', 'noopener noreferrer')
  })
})

describe('MediaItem', () => {
  it('loads a confirmed YouTube video only after Play video is clicked', async () => {
    const m: Media = { kind: 'youtube', src: confirmed('https://www.youtube.com/watch?v=abc123XYZ_0'), alt: 'Gameplay' }
    render(<MediaItem media={m} />)
    expect(document.querySelector('iframe')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: /play video/i }))
    const iframe = document.querySelector('iframe')
    expect(iframe?.getAttribute('src')).toContain('youtube-nocookie.com/embed/abc123XYZ_0')
  })

  it('shows media unavailable plus alt text when an image fails', () => {
    const m: Media = { kind: 'image', src: confirmed('/missing.png'), alt: 'Level screenshot' }
    render(<MediaItem media={m} />)
    fireEvent.error(screen.getByRole('img', { name: 'Level screenshot' }))
    const fig = screen.getByText('media unavailable').closest('figure')!
    expect(within(fig).getByText('Level screenshot')).toBeInTheDocument()
  })

  it('shows nothing for an image whose source is unknown', () => {
    const { container } = render(<MediaItem media={{ kind: 'image', src: pending(), alt: 'Screenshot' }} />)
    expect(container.textContent).toBe('')
  })
})
