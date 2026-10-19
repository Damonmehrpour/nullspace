import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { Raycaster, Vector3, type Material, type Mesh, type Object3D } from 'three'
import { cameraPose } from '../core/cameraRig'
import { CAMERA, MAX_DT } from '../core/config'
import { sim } from './sim'
import { V2 } from './visual'

/** The legacy look keeps its original, closer framing; v2 uses the rig's defaults. */
const POSE = V2 ? {} : { radius: Math.hypot(CAMERA.distance, CAMERA.height - 1), lookHeight: 1, lookAhead: 0 }
const MIN_DISTANCE = 2

/**
 * Places the camera from the pure rig state (orbit yaw, tilt and zoom; see cameraPose), smoothed, with
 * tall blockers either fading (v2) or pulling the camera in.
 */
export function FollowCamera() {
  const camera = useThree((s) => s.camera)
  const scene = useThree((s) => s.scene)
  const tmp = useMemo(() => ({ desired: new Vector3(), look: new Vector3(), smoothLook: new Vector3(), dir: new Vector3(), ray: new Raycaster() }), [])
  const started = useRef(false)

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, MAX_DT)
    if (sim.cameraOverride) {
      camera.position.set(...sim.cameraOverride.pos)
      camera.lookAt(...sim.cameraOverride.look)
      return
    }
    const pose = cameraPose(sim.rig, POSE)
    tmp.look.set(...pose.look)
    tmp.desired.set(...pose.position)

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
      // forceFade: an island can also ask for a fade when the camera passes right beside it.
      const target = fading.has(b) || b.userData.forceFade ? 0.04 : 1
      mat.opacity += (target - mat.opacity) * (1 - Math.exp(-dt * 8))
      mat.depthWrite = mat.opacity > 0.95
    }
    if (hit) tmp.desired.copy(tmp.look).addScaledVector(tmp.dir, Math.max(MIN_DISTANCE, hit.distance - 0.3))

    const k = 1 - Math.exp(-dt * 8)
    if (!started.current) {
      started.current = true
      tmp.smoothLook.copy(tmp.look)
    }
    camera.position.lerp(tmp.desired, k)
    tmp.smoothLook.lerp(tmp.look, k) // tilting lifts the look point; ease it so the view never jumps
    camera.lookAt(tmp.smoothLook)
  })
  return null
}
