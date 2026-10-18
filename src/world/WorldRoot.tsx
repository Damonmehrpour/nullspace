import { PerformanceMonitor } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createQuality, onDecline, onIncline, renderBudget } from '../core/quality'
import { useStore } from '../state/store'
import { ARROW_ID } from './guide/OffscreenArrow'
import { QualityContext } from './quality'
import { Scene } from './Scene'
import { sim } from './sim'
import type { WorldProps } from '../ui/worldLoader'

const CONTEXT_RESTORE_MS = 3000

/** The lazily loaded 3D world. The only module tree that imports three.js. */
export default function WorldRoot({ onFailure }: WorldProps) {
  const lostTimer = useRef<number | null>(null)
  const chosen = useStore((s) => s.settings.quality)
  const [quality, setQuality] = useState(() => createQuality(chosen))
  const budget = useMemo(() => renderBudget(quality), [quality])

  // The visitor's choice is the ceiling; a new choice restarts adaptation from it.
  useEffect(() => setQuality(createQuality(chosen)), [chosen])
  useEffect(() => {
    sim.quality = quality
  }, [quality])

  useEffect(() => () => {
    if (lostTimer.current !== null) window.clearTimeout(lostTimer.current)
  }, [])

  return (
    <div id="world-canvas" tabIndex={-1} className="fixed inset-0 outline-none" aria-label="3D world">
      <Canvas
        dpr={budget.dpr}
        camera={{ fov: 50, near: 0.1, far: 200, position: [0, 4, -6] }}
        onCreated={({ gl }) => {
          const canvas = gl.domElement
          canvas.addEventListener('webglcontextlost', (e) => {
            e.preventDefault()
            lostTimer.current = window.setTimeout(() => onFailure('context'), CONTEXT_RESTORE_MS)
          })
          canvas.addEventListener('webglcontextrestored', () => {
            if (lostTimer.current !== null) window.clearTimeout(lostTimer.current)
            lostTimer.current = null
          })
          useStore.getState().setPhase('world')
        }}
      >
        <PerformanceMonitor onDecline={() => setQuality(onDecline)} onIncline={() => setQuality(onIncline)}>
          <QualityContext.Provider value={budget}>
            <Scene />
          </QualityContext.Provider>
        </PerformanceMonitor>
      </Canvas>
      <div id={ARROW_ID} aria-hidden className="pointer-events-none absolute top-0 left-0 text-3xl font-bold text-moss opacity-0">›</div>
    </div>
  )
}
