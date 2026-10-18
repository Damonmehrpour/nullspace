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
    if (import.meta.env.VITE_TEST_HOOKS === 'true') installTestHooks()
    if (import.meta.env.DEV) (window as unknown as { __sim: typeof sim }).__sim = sim
    return () => {
      sim.input?.dispose()
      sim.input = null
    }
  }, [])

  useFrame(({ gl }, delta) => {
    if (!sim.frozen) simulate(delta)
    sim.renderInfo = { calls: gl.info.render.calls, triangles: gl.info.render.triangles }
  })
  return null
}
