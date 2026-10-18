import { useFrame, useThree } from '@react-three/fiber'
import { useMemo } from 'react'
import { Raycaster, Vector3, type Object3D } from 'three'
import { CAMERA, MAX_DT } from '../core/config'
import { v } from '../core/geometry'
import { sim } from './sim'

const LOOK_HEIGHT = 1
const MIN_DISTANCE = 2

/** Places the camera from the pure rig state, smoothed, and pulled in if geometry blocks the view. */
export function FollowCamera() {
  const camera = useThree((s) => s.camera)
  const scene = useThree((s) => s.scene)
  const tmp = useMemo(() => ({ desired: new Vector3(), look: new Vector3(), dir: new Vector3(), ray: new Raycaster() }), [])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, MAX_DT)
    const r = sim.rig
    const back = v.fromAngle(r.yaw + Math.PI)
    const dist = CAMERA.distance + r.extraDistance
    tmp.look.set(r.aim.x, LOOK_HEIGHT, r.aim.z)
    tmp.desired.set(r.aim.x + back.x * dist, CAMERA.height, r.aim.z + back.z * dist)

    // Short raycast: if a tall blocker (the monolith) sits between aim and camera, pull in.
    tmp.dir.copy(tmp.desired).sub(tmp.look)
    const full = tmp.dir.length()
    tmp.ray.set(tmp.look, tmp.dir.normalize())
    tmp.ray.far = full
    const blockers: Object3D[] = []
    scene.traverse((o) => {
      if (o.userData.blocksCamera) blockers.push(o)
    })
    const hit = tmp.ray.intersectObjects(blockers, false)[0]
    if (hit) tmp.desired.copy(tmp.look).addScaledVector(tmp.dir, Math.max(MIN_DISTANCE, hit.distance - 0.3))

    const k = 1 - Math.exp(-dt * 8)
    camera.position.lerp(tmp.desired, k)
    camera.lookAt(tmp.look)
  })
  return null
}
