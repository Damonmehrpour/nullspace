import { Canvas } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { useStore } from '../state/store'
import type { WorldProps } from '../ui/worldLoader'

const CONTEXT_RESTORE_MS = 3000

/** The lazily loaded 3D world. The only module tree that imports three.js. */
export default function WorldRoot({ onFailure }: WorldProps) {
  const lostTimer = useRef<number | null>(null)

  useEffect(() => () => {
    if (lostTimer.current !== null) window.clearTimeout(lostTimer.current)
  }, [])

  return (
    <div id="world-canvas" tabIndex={-1} className="fixed inset-0 outline-none" aria-label="3D world">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ fov: 50, near: 0.1, far: 200, position: [0, 6, 12] }}
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
        <color attach="background" args={['#000000']} />
        <fogExp2 attach="fog" args={['#000000', 0.018]} />
      </Canvas>
    </div>
  )
}
