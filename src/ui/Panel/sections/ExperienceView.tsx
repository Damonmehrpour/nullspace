import type { ExperienceSection } from '../../../content/schema'
import { AreaTags } from '../../AreaTags'
import { FieldText } from '../../FieldText'
import { Dates, MetaLine } from '../../MetaLine'
import { Entry, EntryList } from './EntryList'

const val = (f: { state: string; value?: unknown } | undefined) => (f && f.state === 'confirmed' ? (f.value as string) : null)

export function ExperienceView({ section }: { section: ExperienceSection }) {
  return (
    <EntryList>
      {section.entries.map((e, i) => (
        <Entry
          key={i}
          minor={e.minor}
          heading={<FieldText field={e.role} />}
          meta={<MetaLine parts={[val(e.org), val(e.dates) && <Dates key="dates">{val(e.dates)}</Dates>, val(e.location)]} />}
        >
          <AreaTags areas={e.areas} className="mb-3" />
          <FieldText field={e.highlights} />
        </Entry>
      ))}
    </EntryList>
  )
}
