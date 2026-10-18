import { useEffect, useRef, useState } from 'react'
import { BOOT_MS } from '../core/config'
import { writeJSON } from '../core/safeStorage'
import { STORAGE_KEYS } from '../state/settings'

const LINES = ['> initialising nullspace', '> calibrating void... adequate', '> locating guide... it found you first', '> structures: floating, as intended']

export function Boot({ onDone }: { onDone: () => void }) {
  const [shown, setShown] = useState(1)
  const done = useRef(false)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useEffect(() => {
    function finish() {
      if (done.current) return
      done.current = true
      writeJSON(STORAGE_KEYS.booted, true)
      onDoneRef.current()
    }
    const step = BOOT_MS / (LINES.length + 1)
    const lineTimer = window.setInterval(() => setShown((n) => Math.min(n + 1, LINES.length)), step)
    const doneTimer = window.setTimeout(finish, BOOT_MS)
    window.addEventListener('keydown', finish)
    window.addEventListener('pointerdown', finish)
    return () => {
      window.clearInterval(lineTimer)
      window.clearTimeout(doneTimer)
      window.removeEventListener('keydown', finish)
      window.removeEventListener('pointerdown', finish)
    }
  }, [])

  return (
    <section aria-label="Starting NULLSPACE" className="fixed inset-0 flex flex-col justify-end bg-void p-6 md:p-12">
      <pre className="m-0 font-mono text-sm leading-relaxed text-ash md:text-base" aria-live="polite">
        {LINES.slice(0, shown).join('\n')}
      </pre>
      <p className="display mt-6 mb-0 text-6xl text-concrete md:text-9xl">NULLSPACE</p>
      <button
        type="button"
        onClick={() => {
          if (done.current) return
          done.current = true
          writeJSON(STORAGE_KEYS.booted, true)
          onDoneRef.current()
        }}
        className="absolute top-6 right-6 border-2 border-concrete px-4 py-1 font-semibold text-concrete"
      >
        Skip
      </button>
    </section>
  )
}
