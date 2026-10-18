import { useEffect } from 'react'
import { capabilities } from './core/capabilities'
import { readJSON } from './core/safeStorage'
import { Portfolio } from './portfolio/Portfolio'
import { STORAGE_KEYS } from './state/settings'
import { useStore } from './state/store'
import { Boot } from './ui/Boot'
import { Entry } from './ui/Entry'
import { PanelHost } from './ui/Panel/PanelHost'
import { TopBar } from './ui/TopBar'
import { A11yStatus } from './ui/A11yStatus'
import { ArtifactPrompt } from './ui/ArtifactPrompt'
import { ControlsHint } from './ui/ControlsHint'
import { Subtitles } from './ui/Subtitles'
import { useGlobalShortcuts } from './ui/useGlobalShortcuts'
import { consumeEnter3dFlag } from './ui/worldLoader'
import { WorldHost } from './ui/WorldHost'

export default function App() {
  const phase = useStore((s) => s.phase)
  const setPhase = useStore((s) => s.setPhase)
  useGlobalShortcuts()

  useEffect(() => {
    if (useStore.getState().phase !== 'boot') return
    // "Reload and retry" is the only path that re-enters 3D without a click on this page.
    if (consumeEnter3dFlag()) setPhase('loading3d')
    else if (readJSON(STORAGE_KEYS.booted, false)) setPhase('entry')
  }, [setPhase])

  const booted = phase !== 'boot' || readJSON(STORAGE_KEYS.booted, false)
  if (!booted) return <Boot onDone={() => setPhase('entry')} />

  const inWorld = phase === 'loading3d' || phase === 'world'
  return (
    <>
      <div id="app-background">
        {inWorld ? <WorldHost /> : phase === 'portfolio' ? <Portfolio /> : <Entry />}
        {phase === 'world' && (
          <>
            <Subtitles />
            <A11yStatus />
            <ControlsHint />
            <ArtifactPrompt />
          </>
        )}
        <TopBar
          mode={inWorld ? 'world' : phase === 'portfolio' ? 'portfolio' : 'entry'}
          onGuideMeThere={(id) => useStore.getState().guideMeThere(id, capabilities.isTouchFirst())}
        />
      </div>
      <PanelHost />
    </>
  )
}
