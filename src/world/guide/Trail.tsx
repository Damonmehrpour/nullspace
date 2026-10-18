import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, BufferAttribute, BufferGeometry, type Points } from 'three'
import { v, type Vec2 } from '../../core/geometry'
import { useRenderBudget } from '../quality'
import { sim } from '../sim'

const SPACING = 0.45

/** Moss spores drifting along the guide's remaining route while it leads or waits. */
export function Trail() {
  const { spores: COUNT } = useRenderBudget()
  const ref = useRef<Points>(null)
  const geo = useMemo(() => {
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array(COUNT * 3), 3))
    return g
  }, [COUNT])

  useFrame(({ clock }) => {
    const pts = ref.current
    if (!pts) return
    const g = sim.guide
    const visible = (g.name === 'lead' || g.name === 'wait') && g.path.length > 1
    pts.visible = visible
    if (!visible) return
    const route: Vec2[] = [g.pos, ...g.path.slice(g.pathIndex)]
    const arr = geo.getAttribute('position') as BufferAttribute
    const t = clock.elapsedTime
    const offset = (t * 0.6) % SPACING
    let seg = 0
    let segStart = 0
    for (let i = 0; i < COUNT; i++) {
      const s = i * SPACING + offset
      while (seg < route.length - 1 && s > segStart + v.dist(route[seg], route[seg + 1])) {
        segStart += v.dist(route[seg], route[seg + 1])
        seg++
      }
      let p: Vec2
      if (seg >= route.length - 1) p = route[route.length - 1]
      else {
        const len = v.dist(route[seg], route[seg + 1])
        p = v.lerp(route[seg], route[seg + 1], len > 0 ? Math.min(1, (s - segStart) / len) : 0)
      }
      const fade = i / COUNT
      arr.setXYZ(i, p.x + Math.sin(t * 2 + i) * 0.08, 0.15 + Math.sin(t * 1.3 + i * 0.7) * 0.1 + fade * 0.2, p.z + Math.cos(t * 2 + i) * 0.08)
    }
    arr.needsUpdate = true
  })

  return (
    <points ref={ref} geometry={geo} frustumCulled={false}>
      <pointsMaterial color="#8fd14f" size={0.09} sizeAttenuation transparent opacity={0.85} fog={false} depthWrite={false} blending={AdditiveBlending} />
    </points>
  )
}
