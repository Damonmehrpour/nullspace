import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'

/** Upper bound on the wait; past it the world shows anyway and compiles what is left on first draw. */
const PRECOMPILE_TIMEOUT_MS = 5000

/**
 * Compiles every shader the mounted scene needs before the first visible frame, while the loading
 * screen is still up. With KHR_parallel_shader_compile the driver compiles in the background
 * instead of stalling one frame for every program (measured: ~1.1 s single-frame freeze in v2).
 */
export function Precompile({ onDone }: { onDone: () => void }) {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  useEffect(() => {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      onDone()
    }
    const timer = window.setTimeout(finish, PRECOMPILE_TIMEOUT_MS)
    // One macrotask so the scene graph (islands, guide, player) is attached before compiling.
    const start = window.setTimeout(() => {
      gl.compileAsync(scene, camera).then(finish, finish)
    }, 0)
    return () => {
      window.clearTimeout(timer)
      window.clearTimeout(start)
    }
  }, [gl, scene, camera, onDone])
  return null
}
