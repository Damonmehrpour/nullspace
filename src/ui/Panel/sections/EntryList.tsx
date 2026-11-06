import type { ReactNode } from 'react'

/** A stack of entries separated by heavy rules — the layout every list-like section shares. */
export function EntryList({ children }: { children: ReactNode }) {
  return <ul className="m-0 list-none space-y-0 p-0">{children}</ul>
}

/** One entry. `minor` entries (e.g. freelance work beside industry roles) are set smaller and quieter. */
export function Entry({ heading, meta, children, minor }: { heading: ReactNode; meta?: ReactNode; children?: ReactNode; minor?: boolean }) {
  return (
    <li data-minor={minor ? '' : undefined} className={`border-t-2 border-current py-6 first:border-t-0 first:pt-0 last:pb-0 ${minor ? 'text-sm opacity-80' : ''}`}>
      <h3 className={`m-0 leading-snug ${minor ? 'text-base font-bold' : 'text-xl font-bold'}`}>{heading}</h3>
      {meta && <div className="mt-1.5 leading-normal opacity-75">{meta}</div>}
      {children && <div className="mt-3">{children}</div>}
    </li>
  )
}
