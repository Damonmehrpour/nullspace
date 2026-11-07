import { useEffect, useMemo, useState } from 'react'
import { capabilities } from '../core/capabilities'
import { useStore } from '../state/store'

const IN_MS = 420
const OUT_MS = 320

/**
 * Shown while the player stands at the portfolio portal: how to go through, and a button that does it
 * (for touch, mouse and screen-reader users; E and Enter work in the world as well).
 */
export function PortalPrompt() {
  const near = useStore((s) => s.nearPortal)
  const busy = useStore((s) => s.panel !== null || s.overlay !== null || s.portalTransit || s.nearArtifact !== null)
  const enter = useStore((s) => s.enterPortal)
  const touch = useMemo(() => capabilities.isTouchFirst(), [])
  if (!near || busy) return null
  return (
    <div data-testid="portal-prompt" className="fixed bottom-24 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3 border-2 border-moss bg-void/85 py-1 pr-1 pl-3 text-sm text-concrete">
      <span aria-live="polite">{touch ? 'Tap the portal' : 'E or Enter'} to open the 2D Portfolio</span>
      <button type="button" className="border border-concrete/40 px-2 py-0.5 text-concrete hover:border-moss focus-visible:border-moss" onClick={enter}>
        Enter the Portfolio
      </button>
    </div>
  )
}

/**
 * The portal's transition: an iris of light opens over the world and closes it to black, the world
 * unmounts behind it and the Portfolio appears as it fades. Reduced motion skips it (enterPortal
 * switches straight away), so this only ever runs for well under a second.
 */
export function PortalTransition() {
  const transit = useStore((s) => s.portalTransit)
  const finish = useStore((s) => s.finishPortal)
  const [stage, setStage] = useState<'idle' | 'in' | 'out'>('idle')

  useEffect(() => {
    if (!transit) return
    setStage('in')
    const t = window.setTimeout(() => {
      finish()
      setStage('out')
    }, IN_MS)
    return () => window.clearTimeout(t)
  }, [transit, finish])

  useEffect(() => {
    if (stage !== 'out') return
    const t = window.setTimeout(() => setStage('idle'), OUT_MS)
    return () => window.clearTimeout(t)
  }, [stage])

  if (stage === 'idle') return null
  return <div aria-hidden="true" data-testid="portal-veil" className={`portal-veil portal-veil-${stage}`} />
}
