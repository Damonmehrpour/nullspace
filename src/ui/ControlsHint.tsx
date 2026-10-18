import { useEffect, useMemo, useState } from 'react'
import { capabilities } from '../core/capabilities'

const SHOW_MS = 6000

/** First-entry controls reminder. Touch visitors get the honest version. */
export function ControlsHint() {
  const touch = useMemo(() => capabilities.isTouchFirst(), [])
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (touch) return
    const t = window.setTimeout(() => setVisible(false), SHOW_MS)
    const hide = (e: KeyboardEvent) => {
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) setVisible(false)
    }
    window.addEventListener('keydown', hide)
    return () => {
      window.clearTimeout(t)
      window.removeEventListener('keydown', hide)
    }
  }, [touch])

  if (!visible) return null
  return (
    <p className="pointer-events-none fixed bottom-24 left-1/2 z-10 m-0 -translate-x-1/2 text-center text-sm text-ash">
      {touch ? (
        'Walking needs a keyboard here, for now. Tap Sections to travel.'
      ) : (
        <>
          <kbd>WASD / arrows</kbd> move · <kbd>E / click</kbd> interact · <kbd>Esc</kbd> close
        </>
      )}
    </p>
  )
}
