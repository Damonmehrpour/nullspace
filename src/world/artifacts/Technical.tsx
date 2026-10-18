import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { BoxGeometry, EdgesGeometry, type Group } from 'three'
import { v, type Vec2 } from '../../core/geometry'
import { sim } from '../sim'

const ASSEMBLE_FROM = 7
const ASSEMBLE_TO = 2

/** Technical: a wireframe lattice cube that assembles as the player approaches. */
export function Technical({ slot }: { slot: Vec2 }) {
  const root = useRef<Group>(null)
  const edges = useMemo(() => new EdgesGeometry(new BoxGeometry(0.35, 0.35, 0.35)), [])
  const cells = useMemo(() => {
    const out: [number, number, number][] = []
    for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) out.push([x, y, z])
    return out
  }, [])

  useFrame((_, dt) => {
    const g = root.current
    if (!g) return
    const d = v.dist(sim.player.pos, slot)
    const t = 1 - Math.min(1, Math.max(0, (d - ASSEMBLE_TO) / (ASSEMBLE_FROM - ASSEMBLE_TO)))
    g.children.forEach((c, i) => {
      const [x, y, z] = cells[i]
      const spread = 0.2 + (1 - t) * 0.55
      c.position.set(x * spread, y * spread, z * spread)
    })
    g.rotation.y += dt * 0.3
  })

  return (
    <group ref={root}>
      {cells.map((_, i) => (
        <lineSegments key={i} geometry={edges}>
          <lineBasicMaterial color="#ecebe6" />
        </lineSegments>
      ))}
    </group>
  )
}
