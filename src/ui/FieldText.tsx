import type { Field } from '../content/schema'

type As = 'p' | 'span' | 'li'

export function pendingCopy(note?: string): string {
  return note ? `[pending] — ${note}` : '[pending]'
}

export function FieldText({ field, as: Tag = 'span', className = '' }: { field: Field<string | string[]>; as?: As; className?: string }) {
  if (field.state === 'pending') {
    return (
      <Tag className={`pending ${className}`} data-pending="">
        {pendingCopy(field.note)}
      </Tag>
    )
  }
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
