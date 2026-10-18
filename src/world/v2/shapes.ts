// Pure shape helpers for the Visual Rebirth (v2) look. No three.js imports, so they stay unit-testable.

export type VisualVersion = 'v1' | 'v2'

/** `?visual=v2` switches the 3D world to the Phase 0 look; anything else keeps the original. */
export function visualVersion(search: string): VisualVersion {
  return new URLSearchParams(search).get('visual') === 'v2' ? 'v2' : 'v1'
}

export type ProfilePoint = { x: number; y: number }

/**
 * Lathe profile for a floating island: a flat walkable top (y = 0) with a small chamfer, a thick
 * rim, then a rock mass tapering to a point `depth` below. Listed top-centre → bottom-tip.
 */
export function islandSlabProfile(radius: number, depth: number): ProfilePoint[] {
  const r = radius
  return [
    { x: 0, y: 0 },
    { x: r - 0.18, y: 0 },
    { x: r, y: -0.18 },
    { x: r, y: -0.7 },
    { x: r * 0.9, y: -1.05 },
    { x: r * 0.74, y: -depth * 0.32 },
    { x: r * 0.52, y: -depth * 0.55 },
    { x: r * 0.3, y: -depth * 0.76 },
    { x: r * 0.12, y: -depth * 0.92 },
    { x: 0, y: -depth },
  ]
}

/** Leaf outline along its length t ∈ [0,1]: width is 0 at both ends, curl grows toward the tip. */
export function leafShape(t: number): { width: number; curl: number } {
  const c = Math.min(1, Math.max(0, t))
  return { width: Math.pow(Math.sin(Math.PI * c), 0.75), curl: c * c }
}
