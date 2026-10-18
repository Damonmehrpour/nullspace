import { useFrame, useThree } from '@react-three/fiber'
import { useMemo } from 'react'
import { Raycaster, Vector3, type Material, type Mesh, type Object3D } from 'three'
import { CAMERA, MAX_DT } from '../core/config'
import { v } from '../core/geometry'
import { sim } from './sim'
import { V2 } from './visual'

/** v2 frames the world, not just the player: higher, farther, aiming ahead so architecture and horizon fit. */
const LOOK_HEIGHT = V2 ? 1.4 : 1
const LOOK_AHEAD = V2 ? 1.8 : 0
const DISTANCE = V2 ? 7.6 : CAMERA.distance
const HEIGHT = V2 ? 4.6 : CAMERA.height
const MIN_DISTANCE = 2

/** Places the camera from the pure rig state, smoothed, and pulled in if geometry blocks the view. */
export function FollowCamera() {
  const camera = useThree((s) => s.camera)
  const scene = useThree((s) => s.scene)
  const tmp = useMemo(() => ({ desired: new Vector3(), look: new Vector3(), dir: new Vector3(), ray: new Raycaster() }), [])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, MAX_DT)
    if (sim.cameraOverride) {
      camera.position.set(...sim.cameraOverride.pos)
      camera.lookAt(...sim.cameraOverride.look)
      return
    }
    const r = sim.rig
    const back = v.fromAngle(r.yaw + Math.PI)
    const dist = DISTANCE + r.extraDistance
    tmp.look.set(r.aim.x - back.x * LOOK_AHEAD, LOOK_HEIGHT, r.aim.z - back.z * LOOK_AHEAD)
    tmp.desired.set(r.aim.x + back.x * dist, HEIGHT, r.aim.z + back.z * dist)

    // Short raycast: if a tall blocker (the monolith) sits between aim and camera, pull in.
    tmp.dir.copy(tmp.desired).sub(tmp.look)
    const full = tmp.dir.length()
    tmp.ray.set(tmp.look, tmp.dir.normalize())
    tmp.ray.far = full
    const blockers: Object3D[] = []
    scene.traverse((o) => {
      if (o.userData.blocksCamera) blockers.push(o)
    })
    const hits = tmp.ray.intersectObjects(blockers, false)
    // v2: blockers marked fadeOnBlock turn translucent instead of pulling the camera into a cramped
    // close-up; every one in the way fades (a corridor of portals can have several).
    const fading = new Set(hits.filter((h) => h.object.userData.fadeOnBlock).map((h) => h.object))
    const hit = hits.find((h) => !h.object.userData.fadeOnBlock)
    for (const b of blockers) {
      if (!b.userData.fadeOnBlock) continue
      const mat = (b as Mesh).material as Material
      const target = fading.has(b) ? 0.04 : 1
      mat.opacity += (target - mat.opacity) * (1 - Math.exp(-dt * 8))
      mat.depthWrite = mat.opacity > 0.95
    }
    if (hit) tmp.desired.copy(tmp.look).addScaledVector(tmp.dir, Math.max(MIN_DISTANCE, hit.distance - 0.3))

    const k = 1 - Math.exp(-dt * 8)
    camera.position.lerp(tmp.desired, k)
    camera.lookAt(tmp.look)
  })
  return null
}
