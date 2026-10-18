import type { EducationSection } from '../../../content/schema'
import { FieldText } from '../../FieldText'
import { Entry, EntryList } from './EntryList'

export function EducationView({ section }: { section: EducationSection }) {
  return (
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
        </Entry>
      ))}
    </EntryList>
  )
}
