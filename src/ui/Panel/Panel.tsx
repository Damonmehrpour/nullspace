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
  /**
   * 'compact' is the 3D world's side panel. 'page' is the 2D Portfolio's full-viewport reading view: a
   * sticky bar with the way back, the title, and a centred reading column; the page behind stays put.
   */
  variant?: 'compact' | 'page'
}

/** Keeps the page behind a full-viewport view from scrolling (its scroll position is kept). */
function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return
    const html = document.documentElement
    const prev = html.style.overflow
    html.style.overflow = 'hidden'
    return () => {
      html.style.overflow = prev
    }
  }, [active])
}

export function Panel({ title, onClose, children, fallbackFocus, badge, variant = 'compact' }: PanelProps) {
  const headingId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const fallbackRef = useRef(fallbackFocus)
  fallbackRef.current = fallbackFocus

  useBackgroundInert()
  useScrollLock(variant === 'page')

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

  if (variant === 'page')
    return createPortal(
      <div className="panel-layer" onKeyDown={onKeyDown}>
        <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={headingId} data-variant="page" className="detail-page fixed inset-0 z-40 overflow-y-auto overscroll-contain bg-void text-concrete">
          <div className="detail-bar sticky top-0 z-10 border-b border-graphite/70 bg-void/95 backdrop-blur-sm">
            <div className="mx-auto flex max-w-[52rem] items-center justify-between gap-4 px-5 py-3 md:px-8">
              <button type="button" onClick={onClose} className="-ml-2 px-2 py-2 font-semibold text-concrete underline-offset-4 hover:underline">
                <span aria-hidden>← </span>Back to portfolio
              </button>
              <span aria-hidden className="display truncate text-base tracking-tight">
                NULLSPACE
              </span>
            </div>
          </div>
          <article className="mx-auto max-w-[52rem] px-5 pt-10 pb-24 md:px-8 md:pt-14">
            <header className="mb-10 max-w-[68ch] border-b-4 border-concrete pb-6">
              {badge}
              <h2 id={headingId} ref={headingRef} tabIndex={-1} className="display mt-3 text-[clamp(2.25rem,8vw,4.5rem)] leading-[0.95] outline-none">
                {title}
              </h2>
            </header>
            <div className="cv-body max-w-[68ch]">{children}</div>
          </article>
        </div>
      </div>,
      document.body,
    )

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
