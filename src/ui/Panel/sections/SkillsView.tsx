import type { SkillsSection } from '../../../content/schema'
import { FieldText } from '../../FieldText'
import { Entry, EntryList } from './EntryList'

export function SkillsView({ section }: { section: SkillsSection }) {
  return (
    <EntryList>
      {section.groups.map((g) => (
        <Entry key={g.label} heading={g.label}>
          <FieldText field={g.items} />
        </Entry>
      ))}
    </EntryList>
  )
}
