import { Fragment, type ReactNode } from 'react'

/**
 * A line of facts ("Org · 08/2025 – 11/2025 · Place"). The separator is glued to the fact before it,
 * so a wrapped line never starts with a dot; empty parts (unknown facts) are left out.
 */
export function MetaLine({ parts, className = '' }: { parts: (ReactNode | null | undefined | false)[]; className?: string }) {
  const shown = parts.filter((p) => p !== null && p !== undefined && p !== false && p !== '')
  return (
    <div className={className}>
      {shown.map((p, i) => (
        <Fragment key={i}>
          {i > 0 && ' · '}
          {p}
        </Fragment>
      ))}
    </div>
  )
}

/** A date range that never breaks across lines ("08/2025 – 11/2025"). */
export function Dates({ children }: { children: ReactNode }) {
  return <span className="whitespace-nowrap">{children}</span>
}
