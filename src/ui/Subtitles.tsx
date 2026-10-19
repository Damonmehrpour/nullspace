import { useEffect, useState } from 'react'
import { DIALOGUE } from '../core/config'
import { isTypingTarget } from '../core/input'
import { isReducedMotion } from '../state/reducedMotion'
import { useStore } from '../state/store'

const NARROW = 768

/** One kokedama line at a time, typed out terminal-style. The full text goes to assistive tech at once. */
export function Subtitles() {
  const subtitle = useStore((s) => s.subtitle)
  const settings = useStore((s) => s.settings)
  const panelOpen = useStore((s) => s.panel !== null)
  const clearSubtitle = useStore((s) => s.clearSubtitle)
  const [shown, setShown] = useState(0)

  const instant = !settings.typing || isReducedMotion(settings)
  const text = subtitle?.text ?? ''

  useEffect(() => {
    if (!subtitle) return
    const len = subtitle.text.length
    setShown(instant ? len : 0)
    const typer = instant
      ? undefined
      : window.setInterval(() => setShown((n) => (n >= len ? n : n + 1)), 1000 / DIALOGUE.typeCharsPerS)
    // The reading time starts once the line has finished typing, so long lines are never cut short.
    const typingMs = instant ? 0 : (len * 1000) / DIALOGUE.typeCharsPerS
    const hold = window.setTimeout(() => clearSubtitle(subtitle.id), typingMs + DIALOGUE.holdBaseMs + DIALOGUE.holdPerCharMs * len)
    return () => {
      if (typer) window.clearInterval(typer)
      window.clearTimeout(hold)
    }
  }, [subtitle, instant, clearSubtitle])

  useEffect(() => {
    if (!subtitle) return
    function onKey(e: KeyboardEvent) {
      if (e.code !== 'Space' || isTypingTarget(e.target) || document.querySelector('[role="dialog"]')) return
      setShown(subtitle!.text.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [subtitle])

  if (!settings.subtitles) return null
  const hiddenForPanel = panelOpen && window.innerWidth < NARROW

  return (
    <>
      <div role="status" aria-live="polite" className="sr-only">
        {text}
      </div>
      {subtitle && !hiddenForPanel && (
        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          onClick={() => setShown(text.length)}
          className="fixed bottom-8 z-20 max-w-[min(42rem,calc(100vw-2rem))] -translate-x-1/2 border-2 border-graphite bg-void/85 px-4 py-2 text-left font-mono text-base text-concrete"
          style={{ left: panelOpen ? 'calc((100vw - min(40rem, 100vw)) / 2)' : '50%' }}
        >
          <span className="mr-2 text-moss">KOKEDAMA ›</span>
          <span data-testid="subtitle-text">{text.slice(0, shown)}</span>
        </button>
      )}
    </>
  )
}
