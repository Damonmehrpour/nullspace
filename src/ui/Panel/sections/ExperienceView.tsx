import type { ExperienceSection } from '../../../content/schema'
import { AreaTags } from '../../AreaTags'
import { FieldText } from '../../FieldText'
import { Entry, EntryList } from './EntryList'

export function ExperienceView({ section }: { section: ExperienceSection }) {
  return (
    <EntryList>
      {section.entries.map((e, i) => (
        <Entry
          key={i}
          minor={e.minor}
          heading={<FieldText field={e.role} />}
          meta={
            <>
              <FieldText field={e.org} /> · <FieldText field={e.dates} />
              {e.location && (
                <>
                  {' '}
                  · <FieldText field={e.location} />
                </>
              )}
            </>
          }
        >
          <AreaTags areas={e.areas} className="mb-2" />
          <FieldText field={e.highlights} />
        </Entry>
      ))}
    </EntryList>
  )
}
