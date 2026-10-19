import { useFrame } from '@react-three/fiber'
import { useEffect } from 'react'
import { WORLD } from '../content/world'
import { createKeyboardInput } from '../core/input'
import { nextTarget } from '../core/tour'
import { useStore } from '../state/store'
import { resetSim, sim, simulate } from './sim'
import { installTestHooks } from './testHooks'

/** The single per-frame driver. Everything gameplay-related advances through simulate(). */
export function GameLoop() {
  useEffect(() => {
    resetSim()
    const s = useStore.getState()
    s.setTourTarget(nextTarget(WORLD.tourOrder, s.worldVisited))
    sim.input = createKeyboardInput(window)
    if (import.meta.env.VITE_TEST_HOOKS === 'true') {
      installTestHooks()
      // Startup profiling must capture the very first frames, so recording can be requested before entering.
      if ((window as unknown as { __recordTimeline?: boolean }).__recordTimeline) sim.timeline = []
    }
    if (import.meta.env.DEV) (window as unknown as { __sim: typeof sim }).__sim = sim
    return () => {
      sim.input?.dispose()
      sim.input = null
    }
  }, [])

  useFrame(({ gl, scene, camera }, delta) => {
    sim.gl = gl
    sim.camera = camera
    sim.scene = scene
    if (!sim.frozen) simulate(delta)
    sim.renderInfo = { calls: gl.info.render.calls, triangles: gl.info.render.triangles }
    if (sim.timeline) {
      const q = sim.quality
      sim.timeline.push({ t: performance.now(), dt: delta * 1000, programs: gl.info.programs?.length ?? 0, calls: gl.info.render.calls, quality: q.effective + (q.reducedDpr ? '/dpr1' : '/dpr1.5') })
    }
  })
  return null
}
