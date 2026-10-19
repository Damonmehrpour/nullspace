import type { Project } from '../../content/schema'
import { AreaTags } from '../AreaTags'
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
  const images = project.media.filter((m) => m.kind === 'image')
  const videos = project.media.filter((m) => m.kind !== 'image')
  return (
    <article aria-label={project.name.state === 'confirmed' ? project.name.value : project.id}>
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={project.status} />
        <AreaTags areas={project.areas} />
      </div>
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
        {project.tech?.state === 'confirmed' && (
          <Row label="Technologies">
            <FieldText field={project.tech} />
          </Row>
        )}
        {project.links.some((l) => l.url.state === 'confirmed') && (
          <Row label="Links">
            <ul className="m-0 list-none space-y-1 p-0">
              {project.links.filter((l) => l.url.state === 'confirmed').map((l) => (
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
      {videos.length > 0 && (
        <div className="mt-4 space-y-4">
          {videos.map((m, i) => (
            <MediaItem key={i} media={m} />
          ))}
        </div>
      )}
      {images.length > 0 && (
        <ul aria-label="Gallery" className="mt-4 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2">
          {images.map((m, i) => (
            <li key={i}>
              <MediaItem media={m} />
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}
