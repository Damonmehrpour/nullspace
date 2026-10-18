import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type { Group } from 'three'
import { reducedMotion } from '../sim'
import { Concrete } from '../v2/Surface'

const FRAGMENTS = 8

function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
}

/** Experimental (placeholder slot): an unstable cluster of fragments that glitches in place. */
export function Experimental() {
  const root = useRef<Group>(null)
  const base = useMemo(() => {
    const r = seeded(7)
    return Array.from({ length: FRAGMENTS }, () => ({
      pos: [(r() - 0.5) * 0.8, (r() - 0.5) * 0.8, (r() - 0.5) * 0.8] as const,
      size: 0.1 + r() * 0.18,
      phase: r() * 10,
    }))
  }, [])

  useFrame(({ clock }) => {
    const g = root.current
    if (!g) return
    const t = clock.elapsedTime
    const calm = reducedMotion()
    g.children.forEach((c, i) => {
      const b = base[i]
      const glitch = !calm && Math.sin(t * 7 + b.phase) > 0.92 ? 0.12 : 0
      c.position.set(b.pos[0] + glitch, b.pos[1] + Math.sin(t + b.phase) * 0.04, b.pos[2] - glitch)
      c.rotation.set(t * 0.4 + b.phase, t * 0.3, 0)
    })
  })

  return (
    <group ref={root}>
      {base.map((b, i) => (
        <mesh key={i}>
          <boxGeometry args={[b.size, b.size, b.size]} />
          <Concrete color={i % 3 === 0 ? '#8a8984' : '#ecebe6'} roughness={0.7} />
        </mesh>
      ))}
    </group>
  )
}
