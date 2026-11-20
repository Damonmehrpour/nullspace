import { useEffect } from 'react'
import { cv } from '../../content/cv'
import type { CV, SectionId } from '../../content/schema'
import { useStore, type OpenSource } from '../../state/store'
import { StatusBadge } from '../StatusBadge'
import { Panel } from './Panel'
import { ProjectDetail } from './ProjectDetail'
import { ContactView } from './sections/ContactView'
import { EducationView } from './sections/EducationView'
import { ExperienceView } from './sections/ExperienceView'
import { ProjectsView } from './sections/ProjectsView'
import { SkillsView } from './sections/SkillsView'

export function SectionView({ id, content = cv, source = 'quicknav' }: { id: SectionId; content?: CV; source?: OpenSource }) {
  switch (id) {
    case 'education':
      return <EducationView section={content.education} />
    case 'experience':
      return <ExperienceView section={content.experience} />
    case 'projects':
      return <ProjectsView section={content.projects} source={source} />
    case 'skills':
      return <SkillsView section={content.skills} />
    case 'contact':
      return <ContactView section={content.contact} />
  }
}

const canvasFallback = () => document.getElementById('world-canvas')

/**
 * In the 2D Portfolio a detail view is a page of its own: opening one adds a browser history entry, so
 * the phone's Back gesture (or the browser's Back button) closes it instead of leaving the site.
 * Closing it any other way steps back over that entry. Returns the close handler to use.
 */
function useDetailHistory(active: boolean, open: boolean, closePanel: () => void): () => void {
  useEffect(() => {
    if (!active || !open) return
    if (!(history.state && history.state.nsDetail)) history.pushState({ ...(history.state ?? {}), nsDetail: true }, '')
    const onPop = () => {
      if (useStore.getState().panel) closePanel()
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [active, open, closePanel])
  return () => {
    if (active && history.state && history.state.nsDetail) history.back()
    else closePanel()
  }
}

/** Renders the open panel (section or project) from the store, or nothing. */
export function PanelHost() {
  const panel = useStore((s) => s.panel)
  const closePanel = useStore((s) => s.closePanel)
  const page = useStore((s) => s.phase === 'portfolio')
  const close = useDetailHistory(page, panel !== null, closePanel)
  if (!panel) return null
  const variant = page ? 'page' : 'compact'

  if (panel.kind === 'project') {
    const project = cv.projects.projects.find((p) => p.id === panel.id)!
    const title = project.name.state === 'confirmed' ? project.name.value : 'Project details'
    return (
      <Panel key={panel.id} title={title} onClose={close} fallbackFocus={canvasFallback} variant={variant}>
        <ProjectDetail project={project} showTitle={false} />
      </Panel>
    )
  }
  const section = cv[panel.id]
  return (
    <Panel key={panel.id} title={section.title} onClose={close} fallbackFocus={canvasFallback} badge={<StatusBadge status={section.status} />} variant={variant}>
      <SectionView id={panel.id} />
    </Panel>
  )
}
