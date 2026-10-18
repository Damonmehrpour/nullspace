import { useFrame } from '@react-three/fiber'
import { useEffect } from 'react'
import { WORLD } from '../content/world'
import { createKeyboardInput } from '../core/input'
import { nextTarget } from '../core/tour'
import { useStore } from '../state/store'
import { resetSim, sim, simulate } from './sim'

/** The single per-frame driver. Everything gameplay-related advances through simulate(). */
export function GameLoop() {
  useEffect(() => {
    resetSim()
    const s = useStore.getState()
    s.setTourTarget(nextTarget(WORLD.tourOrder, s.worldVisited))
    sim.input = createKeyboardInput(window)
    return () => {
      sim.input?.dispose()
      sim.input = null
    }
  }, [])

  useFrame((_, delta) => simulate(delta))
  return null
}
