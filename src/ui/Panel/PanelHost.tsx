import { cv } from '../../content/cv'
import type { CV, SectionId } from '../../content/schema'
import { useStore } from '../../state/store'
import { StatusBadge } from '../StatusBadge'
import { Panel } from './Panel'
import { ProjectDetail } from './ProjectDetail'
import { ContactView } from './sections/ContactView'
import { EducationView } from './sections/EducationView'
import { ExperienceView } from './sections/ExperienceView'
import { ProjectsView } from './sections/ProjectsView'
import { SkillsView } from './sections/SkillsView'

export function SectionView({ id, content = cv }: { id: SectionId; content?: CV }) {
  switch (id) {
    case 'education':
      return <EducationView section={content.education} />
    case 'experience':
      return <ExperienceView section={content.experience} />
    case 'projects':
      return <ProjectsView section={content.projects} source="quicknav" />
    case 'skills':
      return <SkillsView section={content.skills} />
    case 'contact':
      return <ContactView section={content.contact} />
  }
}

const canvasFallback = () => document.getElementById('world-canvas')

/** Renders the open panel (section or project) from the store, or nothing. */
export function PanelHost() {
  const panel = useStore((s) => s.panel)
  const closePanel = useStore((s) => s.closePanel)
  if (!panel) return null

  if (panel.kind === 'project') {
    const project = cv.projects.projects.find((p) => p.id === panel.id)!
    const title = project.name.state === 'confirmed' ? project.name.value : 'Project details'
    return (
      <Panel key={panel.id} title={title} onClose={closePanel} fallbackFocus={canvasFallback}>
        <ProjectDetail project={project} showTitle={false} />
      </Panel>
    )
  }
  const section = cv[panel.id]
  return (
    <Panel key={panel.id} title={section.title} onClose={closePanel} fallbackFocus={canvasFallback} badge={<StatusBadge status={section.status} />}>
      <SectionView id={panel.id} />
    </Panel>
  )
}
