import { useMemo } from 'react'
import { LatheGeometry, Vector2, type BufferGeometry } from 'three'
import { concreteMaterial } from './concrete'
import { islandSlabProfile } from './shapes'

const geoCache = new Map<string, BufferGeometry>()

/** Deterministic jitter so each rock reads as hewn stone rather than a perfect cone. */
function roughen(geo: BufferGeometry, seed: number): BufferGeometry {
  const pos = geo.getAttribute('position')
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    if (y > -0.75) continue // keep the walkable top and rim exact
    const a = Math.atan2(z, x)
    const n = Math.sin(a * 7 + seed) * 0.5 + Math.sin(a * 13 + y * 1.7 + seed * 2) * 0.3 + Math.sin(y * 2.3 + seed) * 0.2
    const k = 1 + n * 0.16
    pos.setXYZ(i, x * k, y + Math.sin(a * 5 + seed) * 0.25, z * k)
  }
  geo.computeVertexNormals()
  return geo
}

function slabGeometry(radius: number, depth: number, seed: number): BufferGeometry {
  const key = `${radius}|${depth}|${seed}`
  let g = geoCache.get(key)
  if (!g) {
    // Lathe wants the profile bottom → top for outward-facing normals.
    const pts = islandSlabProfile(radius, depth)
      .slice()
      .reverse()
      .map((p) => new Vector2(p.x, p.y))
    g = roughen(new LatheGeometry(pts, 40), seed)
    geoCache.set(key, g)
  }
  return g
}

/** A floating island mass: flat walkable top at y = 0 over a hanging rock that fades into the void. */
export function IslandSlab({ position, radius, depth = 6, seed = 1 }: { position: [number, number, number]; radius: number; depth?: number; seed?: number }) {
  const geo = useMemo(() => slabGeometry(radius, depth, seed), [radius, depth, seed])
  return <mesh name="v2-slab" geometry={geo} material={concreteMaterial('#d8d3ca')} position={position} />
}
