import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { restoreFocus } from '../focusReturn'

const TABBABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])'

let inertHolders = 0

/**
 * Marks the app background inert (skipped by Tab, hidden from assistive tech) while mounted.
 * Reference-counted, so closing one dialog never re-enables the background under another.
 */
export function useBackgroundInert(active = true): void {
  useEffect(() => {
    if (!active) return
    const bg = document.getElementById('app-background')
    inertHolders++
    bg?.setAttribute('inert', '')
    return () => {
      inertHolders--
      if (inertHolders === 0) bg?.removeAttribute('inert')
    }
  }, [active])
}

type PanelProps = {
  title: string
  onClose: () => void
  children: ReactNode
  /** Focus target when the opener no longer exists (e.g. the canvas after an in-world arrival). */
  fallbackFocus?: () => HTMLElement | null
  badge?: ReactNode
}

export function Panel({ title, onClose, children, fallbackFocus, badge }: PanelProps) {
  const headingId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const fallbackRef = useRef(fallbackFocus)
  fallbackRef.current = fallbackFocus

  useBackgroundInert()

  useEffect(() => {
    headingRef.current?.focus()
    return () => restoreFocus(fallbackRef.current?.())
  }, [])

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onClose()
      return
    }
    if (e.key !== 'Tab' || !dialogRef.current) return
    const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(TABBABLE))
    if (items.length === 0) {
      e.preventDefault()
      return
    }
    const first = items[0]
    const last = items[items.length - 1]
    const active = document.activeElement
    if (e.shiftKey && (active === first || active === headingRef.current)) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && active === last) {
      e.preventDefault()
      first.focus()
    }
  }

  // Portal to <body>: a dialog must never sit inside #app-background, which it marks inert.
  return createPortal(
    <div className="panel-layer" onKeyDown={onKeyDown}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className="panel fixed inset-0 z-40 flex flex-col overflow-y-auto bg-concrete text-void md:inset-y-0 md:left-auto md:right-0 md:w-[min(40rem,100vw)]"
      >
        <header className="flex items-start justify-between gap-4 border-b-4 border-void px-6 pt-6 pb-4 md:px-8">
          <div>
            {badge}
            <h2 id={headingId} ref={headingRef} tabIndex={-1} className="display mt-2 text-4xl outline-none md:text-5xl">
              {title}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 border-2 border-void px-3 py-1 font-semibold hover:bg-void hover:text-concrete">
            Close
          </button>
        </header>
        <div className="flex-1 px-6 py-6 md:px-8">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
