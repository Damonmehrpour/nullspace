import { AREA_LABEL, type Area } from '../content/schema'

/** Small labels naming which of the author's three areas an item belongs to. */
export function AreaTags({ areas, className = '' }: { areas?: Area[]; className?: string }) {
  if (!areas || areas.length === 0) return null
  return (
    <ul aria-label="Areas" className={`m-0 flex list-none flex-wrap gap-1.5 p-0 ${className}`}>
      {areas.map((a) => (
        <li key={a} className="border border-current px-1.5 text-xs font-semibold opacity-80">
          {AREA_LABEL[a]}
        </li>
      ))}
    </ul>
  )
}
