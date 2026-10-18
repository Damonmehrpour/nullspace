import type { EducationSection } from '../../../content/schema'
import { FieldText } from '../../FieldText'
import { Entry, EntryList } from './EntryList'

export function EducationView({ section }: { section: EducationSection }) {
  return (
    <>
      <EntryList>
        {section.entries.map((e, i) => (
          <Entry
            key={i}
            heading={<FieldText field={e.degree} />}
            meta={
              <>
                <FieldText field={e.institution} /> · <FieldText field={e.dates} />
              </>
            }
          >
            {e.notes && <FieldText field={e.notes} as="p" />}
            {e.thesis && (
              <p className="m-0">
                Thesis:{' '}
                {e.thesis.title.state === 'confirmed' && e.thesis.url?.state === 'confirmed' ? (
                  <a href={e.thesis.url.value} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-4">
                    {e.thesis.title.value}
                  </a>
                ) : (
                  <FieldText field={e.thesis.title} />
                )}
                {e.thesis.score && (
                  <>
                    {' '}
                    · Score <FieldText field={e.thesis.score} />
                  </>
                )}
              </p>
            )}
          </Entry>
        ))}
      </EntryList>
      {section.research && (
        <div className="mt-6 border-t-4 border-current pt-4">
          <h3 className="m-0 text-xl font-bold">Publications</h3>
          <ul className="mt-2 mb-0 list-none space-y-2 p-0">
            {section.research.publications.map((p, i) => (
              <li key={i}>
                <FieldText field={p.citation} />
              </li>
            ))}
          </ul>
          <h3 className="mt-5 mb-0 text-xl font-bold">Research interests</h3>
          <div className="mt-2">
            <FieldText field={section.research.interests} />
          </div>
        </div>
      )}
    </>
  )
}
