import { useFrame } from '@react-three/fiber'
import { useEffect } from 'react'
import { createKeyboardInput } from '../core/input'
import { resetSim, sim, simulate } from './sim'

/** The single per-frame driver. Everything gameplay-related advances through simulate(). */
export function GameLoop() {
  useEffect(() => {
    resetSim()
    sim.input = createKeyboardInput(window)
    return () => {
      sim.input?.dispose()
      sim.input = null
    }
  }, [])

  useFrame((_, delta) => simulate(delta))
  return null
}
