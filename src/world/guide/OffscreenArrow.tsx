import { useFrame, useThree } from '@react-three/fiber'
import { useMemo } from 'react'
import { Vector3 } from 'three'
import { sim } from '../sim'

export const ARROW_ID = 'guide-arrow'
const MARGIN = 0.88

/** Moves the DOM chevron (#guide-arrow) to the screen edge in the guide's direction when it's off-screen. */
export function OffscreenArrow() {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const p = useMemo(() => new Vector3(), [])

  useFrame(() => {
    const el = document.getElementById(ARROW_ID)
    if (!el) return
    const pose = sim.guidePose
    p.set(pose.position.x, pose.height, pose.position.z).project(camera)
    const behind = p.z > 1
    let { x, y } = p
    if (behind) {
      x = -x
      y = -y
    }
    const onScreen = !behind && Math.abs(x) <= 1 && Math.abs(y) <= 1
    if (onScreen) {
      el.style.opacity = '0'
      return
    }
    const scale = MARGIN / Math.max(Math.abs(x), Math.abs(y), 1e-6)
    const ex = x * scale
    const ey = y * scale
    const px = ((ex + 1) / 2) * size.width
    const py = ((1 - ey) / 2) * size.height
    el.style.opacity = '1'
    el.style.transform = `translate(${px}px, ${py}px) translate(-50%, -50%) rotate(${Math.atan2(-ey, ex)}rad)`
  })
  return null
}
