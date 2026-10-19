import type { CV, Field } from '../content/schema'
import { SECTION_IDS } from '../content/schema'
import { experienceChapters } from '../world/v2/experienceChapters'

const value = (f: Field<string> | undefined) => (f && f.state === 'confirmed' ? f.value : null)

/**
 * The first thing a recruiter sees in the plain-page portfolio: the most recent role, the degree,
 * where and how to work together, every contact channel, and a jump to each section. All from the CV.
 */
export function AtAGlance({ cv }: { cv: CV }) {
  const latest = experienceChapters(cv.experience.entries).filter((c) => !c.minor).at(-1)
  const latestEntry = latest && cv.experience.entries.find((e) => value(e.role) === latest.role && value(e.dates) === latest.dates)
  const degree = cv.education.entries[0]
  const location = value(cv.contact.location)
  const availability = value(cv.contact.availability)
  const channels = cv.contact.channels.flatMap((c) => {
    const url = value(c.url)
    const shown = value(c.value)
    if (!url || !shown) return []
    // Email and phone show the address itself; profiles show their name.
    return [{ key: c.kind + c.label, url, text: c.kind === 'email' || c.kind === 'phone' ? shown : c.label, external: c.kind !== 'email' && c.kind !== 'phone' }]
  })

  return (
    <section aria-label="At a glance" className="relative mt-10 grid gap-6 border-2 border-graphite p-5 md:grid-cols-3 md:p-6">
      {latest && latestEntry && (
        <div>
          <p className="m-0 text-sm text-ash">Most recent role</p>
          <p className="m-0 mt-1 text-lg font-semibold">{latest.role}</p>
          <p className="m-0">
            {value(latestEntry.org)} · {latest.dates}
          </p>
        </div>
      )}
      {degree && (
        <div>
          <p className="m-0 text-sm text-ash">Education</p>
          <p className="m-0 mt-1 text-lg font-semibold">{value(degree.degree)}</p>
          <p className="m-0">
            {value(degree.institution)} · {value(degree.dates)}
          </p>
        </div>
      )}
      <div>
        <p className="m-0 text-sm text-ash">Based in</p>
        {location && <p className="m-0 mt-1 text-lg font-semibold">{location}</p>}
        {availability && <p className="m-0">{availability}</p>}
      </div>
      <ul className="m-0 flex list-none flex-wrap gap-x-6 gap-y-2 p-0 md:col-span-3">
        {channels.map((c) => (
          <li key={c.key}>
            <a href={c.url} className="font-semibold underline underline-offset-4" {...(c.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
              {c.text}
            </a>
          </li>
        ))}
      </ul>
      <nav aria-label="Jump to section" className="md:col-span-3">
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {SECTION_IDS.map((id) => (
            <li key={id}>
              <a href={`#portfolio-${id}`} className="inline-block border-2 border-concrete px-3 py-1 font-semibold hover:bg-concrete hover:text-void">
                {cv[id].title}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  )
}
