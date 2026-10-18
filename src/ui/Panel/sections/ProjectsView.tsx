import type { ProjectsSection } from '../../../content/schema'
import { useStore, type OpenSource } from '../../../state/store'
import { FieldText } from '../../FieldText'
import { rememberOpener } from '../../focusReturn'
import { StatusBadge } from '../../StatusBadge'

const APPEARANCE_LABEL = { featured: 'Featured project', technical: 'Technical project', experimental: 'Experimental project' } as const

export function ProjectsView({ section, source }: { section: ProjectsSection; source: OpenSource }) {
  const openProject = useStore((s) => s.openProject)
  return (
    <ul className="m-0 grid list-none gap-4 p-0">
      {section.projects.map((p) => {
        const name = p.name.state === 'confirmed' ? p.name.value : APPEARANCE_LABEL[p.appearance]
        return (
          <li key={p.id}>
            <button
              type="button"
              aria-label={`Open project: ${name}`}
              onClick={(e) => {
                rememberOpener(e.currentTarget)
                openProject(p.id, { source })
              }}
              className="project-card w-full border-4 border-current p-4 text-left transition-colors hover:bg-current/10"
            >
              <span className="block text-sm opacity-75">{APPEARANCE_LABEL[p.appearance]}</span>
              <span className="mt-1 block text-2xl font-bold">
                <FieldText field={p.name} />
              </span>
              <span className="mt-2 block">
                <StatusBadge status={p.status} />
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
