import type { Project } from '../../content/schema'
import { FieldText } from '../FieldText'
import { StatusBadge } from '../StatusBadge'
import { MediaItem } from './MediaItem'

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-t-2 border-slab py-3 md:grid-cols-[9rem_1fr] md:gap-4">
      <dt className="font-semibold">{label}</dt>
      <dd className="m-0">{children}</dd>
    </div>
  )
}

/** Full detail of one project. Used inside the Panel for quick nav, artifacts and the portfolio. */
export function ProjectDetail({ project, showTitle = true }: { project: Project; showTitle?: boolean }) {
  return (
    <article aria-label={project.name.state === 'confirmed' ? project.name.value : project.id}>
      <StatusBadge status={project.status} />
      {showTitle && (
        <h3 className="display mt-2 text-3xl">
          <FieldText field={project.name} />
        </h3>
      )}
      {project.context && <FieldText field={project.context} as="p" className="mt-2 text-lg" />}
      <dl className="mt-4 mb-0">
        <Row label="Summary">
          <FieldText field={project.summary} />
        </Row>
        <Row label="My role">
          <FieldText field={project.role} />
        </Row>
        <Row label="Technologies">
          <FieldText field={project.tech} />
        </Row>
        {project.links.length > 0 && (
          <Row label="Links">
            <ul className="m-0 list-none space-y-1 p-0">
              {project.links.map((l) => (
                <li key={l.label}>
                  {l.url.state === 'confirmed' ? (
                    <a href={l.url.value} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-4">
                      {l.label}
                    </a>
                  ) : (
                    <span>
                      {l.label} <span className="pending">[pending]</span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </Row>
        )}
      </dl>
      {project.media.length > 0 && (
        <div className="mt-4 space-y-4">
          {project.media.map((m, i) => (
            <MediaItem key={i} media={m} />
          ))}
        </div>
      )}
    </article>
  )
}
