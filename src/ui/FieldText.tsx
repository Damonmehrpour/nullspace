import type { Field } from '../content/schema'

type As = 'p' | 'span' | 'li'

/** A confirmed field's text. Unknown (pending or absent) fields render nothing: visitors never see placeholders. */
export function FieldText({ field, as: Tag = 'span', className = '' }: { field: Field<string | string[]> | undefined; as?: As; className?: string }) {
  if (!field || field.state === 'pending') return null
  if (Array.isArray(field.value)) {
    return (
      <ul className={`field-list ${className}`}>
        {field.value.map((v) => (
          <li key={v}>{v}</li>
        ))}
      </ul>
    )
  }
  return <Tag className={className}>{field.value}</Tag>
}
