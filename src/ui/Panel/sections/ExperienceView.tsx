import type { ExperienceSection } from '../../../content/schema'
import { FieldText } from '../../FieldText'
import { Entry, EntryList } from './EntryList'

export function ExperienceView({ section }: { section: ExperienceSection }) {
  return (
    <EntryList>
      {section.entries.map((e, i) => (
        <Entry
          key={i}
          heading={<FieldText field={e.role} />}
          meta={
            <>
              <FieldText field={e.org} /> · <FieldText field={e.dates} />
            </>
          }
        >
          <FieldText field={e.highlights} />
        </Entry>
      ))}
    </EntryList>
  )
}
