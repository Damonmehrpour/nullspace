import type { ContactSection } from '../../../content/schema'
import { FieldText } from '../../FieldText'
import { Entry, EntryList } from './EntryList'

export function ContactView({ section }: { section: ContactSection }) {
  return (
    <>
      <p className="mt-0 mb-4 text-lg">
        <FieldText field={section.location} />
        <br />
        <FieldText field={section.availability} className="font-semibold" />
      </p>
      <EntryList>
        {section.channels.map((c) => (
          <Entry key={c.label} heading={c.label}>
            {c.value.state === 'confirmed' && c.url?.state === 'confirmed' ? (
              <a href={c.url.value} className="font-semibold underline underline-offset-4" {...(c.kind === 'email' ? {} : { target: '_blank', rel: 'noopener noreferrer' })}>
                {c.value.value}
              </a>
            ) : (
              <FieldText field={c.value} />
            )}
          </Entry>
        ))}
      </EntryList>
    </>
  )
}
