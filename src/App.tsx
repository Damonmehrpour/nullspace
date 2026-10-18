import { useEffect } from 'react'
import { readJSON } from './core/safeStorage'
import { STORAGE_KEYS } from './state/settings'
import { useStore } from './state/store'
import { Boot } from './ui/Boot'
import { Portfolio } from './portfolio/Portfolio'
import { Entry } from './ui/Entry'
import { PanelHost } from './ui/Panel/PanelHost'
import { TopBar } from './ui/TopBar'
import { useGlobalShortcuts } from './ui/useGlobalShortcuts'

export default function App() {
  const phase = useStore((s) => s.phase)
  const setPhase = useStore((s) => s.setPhase)
  useGlobalShortcuts()

  useEffect(() => {
    if (useStore.getState().phase === 'boot' && readJSON(STORAGE_KEYS.booted, false)) setPhase('entry')
  }, [setPhase])

  const booted = phase !== 'boot' || readJSON(STORAGE_KEYS.booted, false)
  if (!booted) return <Boot onDone={() => setPhase('entry')} />

  return (
    <>
      <div id="app-background">
        <TopBar mode={phase === 'world' ? 'world' : phase === 'portfolio' ? 'portfolio' : 'entry'} />
        {phase === 'portfolio' ? <Portfolio /> : <Entry />}
      </div>
      <PanelHost />
    </>
  )
}
