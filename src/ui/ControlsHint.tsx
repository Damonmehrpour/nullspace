import { useEffect, useMemo, type ReactNode } from 'react'
import { capabilities } from '../core/capabilities'
import { useStore } from '../state/store'

/** How long the card stays up on its own; the Controls button in the top bar brings it back. */
const SHOW_MS = 14_000

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[8.5rem_1fr] items-baseline gap-3 py-1">
      <dt className="m-0 font-semibold text-concrete">{label}</dt>
      <dd className="m-0 text-concrete/90">{children}</dd>
    </div>
  )
}

const K = ({ children }: { children: ReactNode }) => <kbd className="rounded-sm border border-concrete/60 px-1.5 py-px font-mono text-[0.8em]">{children}</kbd>

/** The controls card: shown on entering the world, reopened from the top bar's Controls button. */
export function ControlsHint() {
  const touch = useMemo(() => capabilities.isTouchFirst(), [])
  const open = useStore((s) => s.controlsOpen)
  const setOpen = useStore((s) => s.setControlsOpen)

  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => setOpen(false), SHOW_MS)
    return () => window.clearTimeout(t)
  }, [open, setOpen])

  if (!open) return null
  return (
    <section aria-label="Controls" className="fixed bottom-24 left-4 z-10 max-w-[min(26rem,calc(100vw-2rem))] border-2 border-graphite bg-void/85 p-4 text-sm backdrop-blur-sm md:left-6">
      <div className="mb-2 flex items-center justify-between gap-4">
        <h2 className="m-0 text-base font-bold text-concrete">Controls</h2>
        <button type="button" onClick={() => setOpen(false)} className="px-2 py-1 font-semibold text-concrete underline-offset-4 hover:underline">
          Hide
        </button>
      </div>
      {touch ? (
        <dl className="m-0">
          <Row label="Look around">Drag to look around</Row>
          <Row label="Zoom">Pinch to zoom</Row>
          <Row label="Travel">Walking needs a keyboard. Open Sections and choose Guide me there.</Row>
        </dl>
      ) : (
        <dl className="m-0">
          <Row label="Move">
            <K>W</K> <K>A</K> <K>S</K> <K>D</K> or arrow keys
          </Row>
          <Row label="Look around">
            Drag with the mouse, or <K>J</K> <K>L</K> turn, <K>I</K> <K>K</K> tilt
          </Row>
          <Row label="Zoom">
            Mouse wheel or <K>+</K> <K>−</K>
          </Row>
          <Row label="Recenter camera">
            <K>C</K>
          </Row>
          <Row label="Interact">
            <K>E</K>, <K>Enter</K> or click
          </Row>
          <Row label="Close">
            <K>Esc</K> closes panels
          </Row>
        </dl>
      )}
    </section>
  )
}
