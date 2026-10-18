import { useEffect } from 'react'
import { SECTION_IDS } from '../content/schema'
import { isTypingTarget } from '../core/input'
import { useStore } from '../state/store'
import { rememberOpener } from './focusReturn'

/** 1–5 open sections, Esc closes the panel. Never fires while typing or while a dialog is open. */
export function useGlobalShortcuts(): void {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || isTypingTarget(e.target)) return
      const s = useStore.getState()
      if (e.key === 'Escape') {
        if (s.panel) s.closePanel()
        return
      }
      if (s.panel || document.querySelector('[role="dialog"]')) return
      const n = Number(e.key)
      if (Number.isInteger(n) && n >= 1 && n <= SECTION_IDS.length) {
        rememberOpener(document.activeElement instanceof HTMLElement ? document.activeElement : null)
        s.openSection(SECTION_IDS[n - 1], { source: 'quicknav' })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
