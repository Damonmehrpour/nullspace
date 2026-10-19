import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { applyLook, recenter } from '../core/cameraRig'
import { isTypingTarget } from '../core/input'
import { useStore } from '../state/store'
import { sim } from './sim'

/** Radians of turn per pixel dragged, by sensitivity setting. */
const DRAG_RATE = { low: 0.0028, normal: 0.0045, high: 0.007 } as const
/** Held-key look speed (rad/s) and zoom speed (log-distance per second). */
const KEY_TURN = 1.9
const KEY_TILT = 1.0
const KEY_ZOOM = 1.2
/** A press that moves less than this (px) stays a click (open an artifact); ArtifactShell uses the same. */
export const DRAG_THRESHOLD = 5

const LOOK_KEYS = new Set(['KeyJ', 'KeyL', 'KeyI', 'KeyK', 'Equal', 'Minus', 'NumpadAdd', 'NumpadSubtract'])

/**
 * Looking around: drag (mouse or one finger) to orbit and tilt, wheel or pinch to zoom, and the keys
 * J/L (turn), I/K (tilt), +/- (zoom) and C (recenter behind the wanderer). Movement stays WASD/arrows,
 * relative to wherever the camera faces. Everything lands in the camera rig's look state.
 */
export function CameraControls() {
  const gl = useThree((s) => s.gl)
  const held = useRef(new Set<string>())

  useEffect(() => {
    const el = gl.domElement
    const pointers = new Map<number, { x: number; y: number; startX: number; startY: number }>()
    let dragging = false
    let pinch: number | null = null

    const settings = () => useStore.getState().settings
    const look = (yaw: number, pitch: number, zoom: number) => {
      sim.rig = applyLook(sim.rig, { yaw, pitch: settings().invertLook ? -pitch : pitch, zoom })
    }

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY })
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()]
        pinch = Math.hypot(a.x - b.x, a.y - b.y)
      }
    }
    const onMove = (e: PointerEvent) => {
      const p = pointers.get(e.pointerId)
      if (!p) return
      const dx = e.clientX - p.x
      const dy = e.clientY - p.y
      p.x = e.clientX
      p.y = e.clientY
      if (pointers.size >= 2) {
        const [a, b] = [...pointers.values()]
        const d = Math.hypot(a.x - b.x, a.y - b.y)
        if (pinch) look(0, 0, Math.log(pinch / Math.max(d, 1)))
        pinch = d
        dragging = true
        return
      }
      if (!dragging && Math.hypot(e.clientX - p.startX, e.clientY - p.startY) < DRAG_THRESHOLD) return
      if (!dragging) {
        dragging = true
        el.setPointerCapture?.(e.pointerId)
        el.style.cursor = 'grabbing'
      }
      const rate = DRAG_RATE[settings().lookSensitivity]
      // Drag right to look right; drag up to look up (the camera lowers and the view tilts up).
      look(dx * rate, dy * rate * 0.75, 0)
    }
    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId)
      if (pointers.size < 2) pinch = null
      if (pointers.size === 0) {
        dragging = false
        el.style.cursor = ''
      }
    }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      look(0, 0, Math.max(-0.4, Math.min(0.4, e.deltaY * 0.0012)))
    }
    const blocked = (e: KeyboardEvent) => isTypingTarget(e.target) || e.altKey || e.ctrlKey || e.metaKey || document.querySelector('[role="dialog"]') !== null
    const onKeyDown = (e: KeyboardEvent) => {
      if (blocked(e)) return
      if (e.code === 'KeyC') {
        sim.rig = recenter(sim.rig, sim.player.facing)
        return
      }
      if (LOOK_KEYS.has(e.code)) held.current.add(e.code)
    }
    const onKeyUp = (e: KeyboardEvent) => held.current.delete(e.code)
    const clear = () => {
      held.current.clear()
      pointers.clear()
      dragging = false
      pinch = null
    }

    el.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    el.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', clear)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      el.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', clear)
    }
  }, [gl])

  // Held look keys turn, tilt and zoom smoothly.
  useFrame((_, rawDt) => {
    const k = held.current
    if (k.size === 0) return
    const dt = Math.min(rawDt, 0.1)
    const turn = (k.has('KeyL') ? 1 : 0) - (k.has('KeyJ') ? 1 : 0)
    const tilt = (k.has('KeyK') ? 1 : 0) - (k.has('KeyI') ? 1 : 0)
    const zoom = (k.has('Minus') || k.has('NumpadSubtract') ? 1 : 0) - (k.has('Equal') || k.has('NumpadAdd') ? 1 : 0)
    const invert = useStore.getState().settings.invertLook ? -1 : 1
    sim.rig = applyLook(sim.rig, { yaw: turn * KEY_TURN * dt, pitch: tilt * KEY_TILT * dt * invert, zoom: zoom * KEY_ZOOM * dt })
  })
  return null
}
