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
  it.each([
    ['education', () => <EducationView section={cv.education} />],
    ['experience', () => <ExperienceView section={cv.experience} />],
    ['skills', () => <SkillsView section={cv.skills} />],
    ['contact', () => <ContactView section={cv.contact} />],
  ])('%s renders launch content with pending markers', (_, view) => {
    render(view())
    expect(screen.getAllByText('[pending]').length).toBeGreaterThan(0)
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
  it('shows only confirmed facts for project 01, with no fake embed', () => {
    render(<ProjectDetail project={cv.projects.projects[0]} />)
    expect(screen.getByText('IN DOCUMENTATION')).toBeInTheDocument()
    expect(screen.getByText('Developed with a team at the University of Oulu, OASIS department')).toBeInTheDocument()
    expect(screen.getByText('video coming soon')).toBeInTheDocument()
    expect(document.querySelector('iframe')).toBeNull()
  })

  it('labels project 03 as a placeholder', () => {
    render(<ProjectDetail project={cv.projects.projects[2]} />)
    expect(screen.getByText('PLACEHOLDER')).toBeInTheDocument()
  })

  it('does not render links whose url is pending', () => {
    const p: Project = { ...cv.projects.projects[1], links: [{ kind: 'github', label: 'Repository', url: pending() }] }
    render(<ProjectDetail project={p} />)
    expect(screen.queryByRole('link', { name: /repository/i })).toBeNull()
    expect(screen.getByText(/Repository/)).toBeInTheDocument()
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

  it('shows image coming soon for a pending image', () => {
    render(<MediaItem media={{ kind: 'image', src: pending(), alt: 'Screenshot' }} />)
    expect(screen.getByText('image coming soon')).toBeInTheDocument()
  })
})
