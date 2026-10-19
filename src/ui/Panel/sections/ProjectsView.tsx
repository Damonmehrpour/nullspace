import { AREA_LABEL, type Project, type ProjectsSection } from '../../../content/schema'
import { useStore, type OpenSource } from '../../../state/store'
import { AreaTags } from '../../AreaTags'
import { FieldText } from '../../FieldText'
import { rememberOpener } from '../../focusReturn'
import { StatusBadge } from '../../StatusBadge'

const areaLine = (p: Project) => p.areas.map((a) => AREA_LABEL[a]).join(' · ')

export function ProjectsView({ section, source }: { section: ProjectsSection; source: OpenSource }) {
  const openProject = useStore((s) => s.openProject)
  return (
    <>
      <ul className="m-0 grid list-none gap-4 p-0">
        {section.projects.map((p) => {
          const name = p.name.state === 'confirmed' ? p.name.value : areaLine(p)
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
                <span className="block text-sm opacity-75">{areaLine(p)}</span>
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
      {section.honors.length > 0 && (
        <div className="mt-6 border-t-4 border-current pt-4">
          <h3 className="m-0 text-xl font-bold">Honors</h3>
          <ul className="mt-2 mb-0 list-none space-y-4 p-0">
            {section.honors.map((h) => (
              <li key={h.project}>
                <div className="font-bold">{h.project}</div>
                <div className="opacity-80">
                  <FieldText field={h.award} /> · {h.event}
                  {h.year?.state === 'confirmed' && <> · {h.year.value}</>}
                </div>
                <FieldText field={h.detail} as="p" className="mt-1 mb-1" />
                <AreaTags areas={h.areas} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}
