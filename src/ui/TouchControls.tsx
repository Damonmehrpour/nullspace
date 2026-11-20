import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { cv } from '../content/cv'
import { releaseTouchStick, stickFromDrag, touchStick } from '../core/touchStick'
import { useStore } from '../state/store'
import { projectLabel } from './ArtifactPrompt'

/** How far (px) the knob travels from the stick's centre at full speed. */
const TRAVEL = 46
const BASE = 128

/**
 * On-screen controls for touch devices, over the 3D world: a joystick in the lower left that walks the
 * wanderer (put a thumb anywhere in that corner; the stick appears under it), and a large action
 * button in the lower right whenever there is something to open. Dragging anywhere else on the screen
 * turns the camera (CameraControls), so a second finger can look around while the first one walks.
 */
export function TouchControls() {
  const zone = useRef<HTMLDivElement>(null)
  const [stick, setStick] = useState<{ id: number; cx: number; cy: number; kx: number; ky: number } | null>(null)
  const panelOpen = useStore((s) => s.panel !== null || s.overlay !== null || s.portalTransit)

  // Never leave the stick held: release it on unmount, when a panel opens, and when the page hides.
  useEffect(() => {
    const release = () => {
      releaseTouchStick()
      setStick(null)
    }
    const onVis = () => document.visibilityState === 'hidden' && release()
    window.addEventListener('blur', release)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('blur', release)
      document.removeEventListener('visibilitychange', onVis)
      release()
    }
  }, [])
  useEffect(() => {
    if (panelOpen) {
      releaseTouchStick()
      setStick(null)
    }
  }, [panelOpen])

  const down = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (stick || panelOpen) return
    e.preventDefault()
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // the pointer is already gone (a very short tap); its pointerup still arrives
    }
    // The stick appears under the thumb, kept fully on screen.
    const r = e.currentTarget.getBoundingClientRect()
    const cx = Math.max(r.left + BASE / 2, Math.min(e.clientX, r.right - BASE / 2))
    const cy = Math.max(r.top + BASE / 2, Math.min(e.clientY, r.bottom - BASE / 2))
    setStick({ id: e.pointerId, cx, cy, kx: e.clientX - cx, ky: e.clientY - cy })
    const s = stickFromDrag(e.clientX - cx, e.clientY - cy, TRAVEL)
    Object.assign(touchStick, { ...s, active: true })
  }
  const move = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!stick || e.pointerId !== stick.id) return
    const dx = e.clientX - stick.cx
    const dy = e.clientY - stick.cy
    const d = Math.hypot(dx, dy)
    const k = d > TRAVEL ? TRAVEL / d : 1
    setStick({ ...stick, kx: dx * k, ky: dy * k })
    const s = stickFromDrag(dx, dy, TRAVEL)
    touchStick.x = s.x
    touchStick.y = s.y
  }
  const up = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!stick || e.pointerId !== stick.id) return
    releaseTouchStick()
    setStick(null)
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-10" data-testid="touch-controls">
      <div
        ref={zone}
        data-testid="touch-stick-zone"
        aria-hidden
        className="touch-zone pointer-events-auto absolute"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onLostPointerCapture={up}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* The resting stick shows where to put a thumb; while held, it follows the touch. */}
        <div
          className="absolute rounded-full border-2 border-concrete/45 bg-void/35"
          style={
            stick
              ? { width: BASE, height: BASE, left: stick.cx - (zone.current?.getBoundingClientRect().left ?? 0) - BASE / 2, top: stick.cy - (zone.current?.getBoundingClientRect().top ?? 0) - BASE / 2 }
              : { width: BASE, height: BASE, left: 0, bottom: 0 }
          }
        >
          <div
            className="absolute rounded-full bg-concrete/80"
            style={{ width: 54, height: 54, left: BASE / 2 - 27 + (stick?.kx ?? 0), top: BASE / 2 - 27 + (stick?.ky ?? 0) }}
          />
        </div>
      </div>
      <ActionButton />
    </div>
  )
}

/** The contextual action: open the project you stand at, or go through the Portfolio portal. */
function ActionButton() {
  const near = useStore((s) => s.nearArtifact)
  const portal = useStore((s) => s.nearPortal)
  const busy = useStore((s) => s.panel !== null || s.overlay !== null || s.portalTransit)
  if (busy || (near === null && !portal)) return null
  const project = near !== null ? cv.projects.projects[near] : null
  const label = project ? `Open ${projectLabel(project)}` : 'Enter the Portfolio'
  return (
    <button
      type="button"
      data-testid="touch-action"
      className="touch-act pointer-events-auto absolute border-2 border-moss bg-void/90 px-5 font-semibold text-concrete active:bg-moss active:text-void"
      onClick={() => {
        const s = useStore.getState()
        if (project) s.openProject(project.id, { source: 'artifact' })
        else s.enterPortal()
      }}
    >
      {label}
    </button>
  )
}
