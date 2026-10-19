import { PerformanceMonitor } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { capabilities } from '../core/capabilities'
import { createQuality, detectQualityTier, onDecline, onIncline, renderBudget, type DeviceHints, type QualityLevel } from '../core/quality'
import { useStore } from '../state/store'
import { ARROW_ID } from './guide/OffscreenArrow'
import { Precompile } from './Precompile'
import { QualityContext } from './quality'
import { Scene } from './Scene'
import { sim } from './sim'
import { CONCRETE_DETAIL } from './v2/concrete'
import { V2 } from './visual'
import { Loading3D } from '../ui/Loading3D'
import { markContextLost, registerWorldContext, type WorldProps } from '../ui/worldLoader'

const CONTEXT_RESTORE_MS = 3000

/** What the browser tells us about this device (renderer filled in once the GL context exists). */
function deviceHints(renderer = ''): DeviceHints {
  const nav = navigator as Navigator & { deviceMemory?: number }
  return { renderer, cores: nav.hardwareConcurrency || undefined, memory: nav.deviceMemory, touch: capabilities.isTouchFirst() }
}

function rendererName(gl: WebGLRenderingContext | WebGL2RenderingContext): string {
  const ext = gl.getExtension('WEBGL_debug_renderer_info')
  return String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER) ?? '')
}

/** The lazily loaded 3D world. The only module tree that imports three.js. */
export default function WorldRoot({ onFailure }: WorldProps) {
  const lostTimer = useRef<number | null>(null)
  // While the context is lost nothing may render against it, or three.js throws and masks the real cause.
  const [contextLost, setContextLost] = useState(false)
  // Nothing draws until every shader is compiled, so the first visible frame doesn't freeze.
  const [compiled, setCompiled] = useState(false)
  const onCompiled = useCallback(() => {
    setCompiled(true)
    useStore.getState().setPhase('world')
  }, [])
  const chosen = useStore((s) => s.settings.quality)
  // Auto: a conservative level for this device, refined with the GPU's name once the context exists.
  const [detected, setDetected] = useState<QualityLevel>(() => detectQualityTier(deviceHints()))
  const [quality, setQuality] = useState(() => createQuality(chosen, detected))
  const budget = useMemo(() => renderBudget(quality), [quality])

  // The visitor's choice (or the detected level on Auto) is the ceiling; a change restarts adaptation.
  useEffect(() => setQuality(createQuality(chosen, detected)), [chosen, detected])
  useEffect(() => {
    sim.quality = quality
    // v2: adaptive Low also drops the per-pixel concrete detail, not just the moss fuzz.
    CONCRETE_DETAIL.value = quality.effective === 'low' ? 0 : 1
  }, [quality])

  useEffect(() => () => {
    if (lostTimer.current !== null) window.clearTimeout(lostTimer.current)
  }, [])

  return (
    <div id="world-canvas" tabIndex={-1} className="fixed inset-0 outline-none" aria-label="3D world">
      <Canvas
        // Never render more pixels than the screen has: a 1x display stays at 1x even on High.
        dpr={[1, budget.dpr]}
        frameloop={contextLost || !compiled ? 'never' : 'always'}
        camera={{ fov: V2 ? 42 : 50, near: 0.1, far: V2 ? 900 : 200, position: [0, 4, -6] }}
        onCreated={({ gl }) => {
          const canvas = gl.domElement
          registerWorldContext(gl.getContext())
          setDetected(detectQualityTier(deviceHints(rendererName(gl.getContext()))))
          canvas.addEventListener('webglcontextlost', (e) => {
            e.preventDefault()
            markContextLost()
            setContextLost(true)
            lostTimer.current = window.setTimeout(() => onFailure('context'), CONTEXT_RESTORE_MS)
          })
          canvas.addEventListener('webglcontextrestored', () => {
            if (lostTimer.current !== null) window.clearTimeout(lostTimer.current)
            lostTimer.current = null
            setContextLost(false)
          })
        }}
      >
        <PerformanceMonitor onDecline={() => !sim.qualityLocked && setQuality(onDecline)} onIncline={() => !sim.qualityLocked && setQuality(onIncline)}>
          <QualityContext.Provider value={budget}>
            <Scene />
          </QualityContext.Provider>
          {!compiled && <Precompile onDone={onCompiled} />}
        </PerformanceMonitor>
      </Canvas>
      {!compiled && <Loading3D />}
      <div id={ARROW_ID} aria-hidden className="pointer-events-none absolute top-0 left-0 text-3xl font-bold text-moss opacity-0">›</div>
    </div>
  )
}
