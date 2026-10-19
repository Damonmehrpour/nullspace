import { useEffect, useRef, useState } from 'react'
import type { SectionId } from '../content/schema'
import { WORLD_AVAILABLE } from '../core/config'
import { useStore } from '../state/store'
import { rememberOpener } from './focusReturn'
import { QuickNav } from './QuickNav'
import { Settings } from './Settings'

type Mode = 'world' | 'portfolio' | 'entry'

const linkClass = 'px-2 py-1 font-semibold hover:underline underline-offset-4'

export function TopBar({ mode, onGuideMeThere }: { mode: Mode; onGuideMeThere?: (id: SectionId) => void }) {
  const [navOpen, setNavOpen] = useState(false)
  const settingsOpen = useStore((s) => s.overlay === 'settings')
  const setOverlay = useStore((s) => s.setOverlay)
  const controlsOpen = useStore((s) => s.controlsOpen)
  const sound = useStore((s) => s.settings.sound)
  const updateSettings = useStore((s) => s.updateSettings)
  const setControlsOpen = useStore((s) => s.setControlsOpen)
  const openSection = useStore((s) => s.openSection)
  const setPhase = useStore((s) => s.setPhase)
  const setModePreference = useStore((s) => s.setModePreference)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!navOpen) return
    function onDown(e: PointerEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setNavOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setNavOpen(false)
    }
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [navOpen])

  function open(id: SectionId, el: HTMLElement) {
    rememberOpener(el)
    setNavOpen(false)
    openSection(id, { source: 'quicknav' })
  }

  return (
    <nav aria-label="Quick navigation" className="fixed inset-x-0 top-0 z-20 flex items-center justify-between gap-2 border-b border-graphite/60 bg-void px-4 py-3 md:px-6">
      <span className="display text-lg tracking-tight">NULLSPACE</span>
      <div ref={wrapRef} className="relative flex flex-wrap items-center justify-end gap-x-1 gap-y-1 text-sm md:text-base">
        {/* Projects lives in Sections on narrow screens; Contact always stays one tap away. */}
        <button type="button" className={`${linkClass} hidden sm:inline-block`} onClick={(e) => open('projects', e.currentTarget)}>
          Projects
        </button>
        <button type="button" className={linkClass} onClick={(e) => open('contact', e.currentTarget)}>
          Contact
        </button>
        <button
          id="quicknav-toggle"
          type="button"
          aria-expanded={navOpen}
          aria-controls="quicknav"
          className={`${linkClass} border-2 border-concrete`}
          onClick={() => setNavOpen((o) => !o)}
        >
          Sections
        </button>
        <button
          type="button"
          className={linkClass}
          onClick={(e) => {
            rememberOpener(e.currentTarget)
            setNavOpen(false)
            setOverlay('settings')
          }}
        >
          Settings
        </button>
        {mode === 'world' && (
          <button type="button" className={linkClass} aria-pressed={sound} onClick={() => updateSettings({ sound: !sound })}>
            {sound ? 'Sound on' : 'Sound off'}
          </button>
        )}
        {mode === 'world' && (
          <button type="button" className={linkClass} aria-pressed={controlsOpen} onClick={() => setControlsOpen(!controlsOpen)}>
            Controls
          </button>
        )}
        {mode === 'world' && (
          <button type="button" className={linkClass} onClick={() => setPhase('portfolio')}>
            Exit to Portfolio
          </button>
        )}
        {mode === 'portfolio' && WORLD_AVAILABLE && (
          <button
            type="button"
            className={linkClass}
            onClick={() => {
              setModePreference('world')
              setPhase('loading3d')
            }}
          >
            Enter 3D
          </button>
        )}
        {settingsOpen && <Settings onClose={() => setOverlay(null)} />}
        {navOpen && <QuickNav world={mode === 'world'} onGuideMeThere={onGuideMeThere} onDone={() => setNavOpen(false)} />}
      </div>
    </nav>
  )
}
