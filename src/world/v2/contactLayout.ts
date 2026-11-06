// The Signal Tower's layout, shared by its meshes (ContactV2) and its colliders. Island-local space:
// +x points outward.

export function deg(d: number) {
  return (d * Math.PI) / 180
}

export const T = { x: 2.4, z: 0 } // tower axis
export const SLABS = 6
export const SLAB = { len: 1.7, t: 0.3, d: 1.0, off: 0.45, y0: 0.95, step: 1.05, turn: 55 }
export const CORE = { w: 0.55, h: 7.0 }
export const HOUSE = { w: 1.5, h: 1.7, d: 0.9 } // the station house at the tower's foot
// Stones lean back so their faces catch the sky light and face the camera (upright faces sat in shade).
export const STONE = { w: 1.25, h: 1.3, d: 0.22, r: 3.15, spread: 46, lean: deg(30) }

export type Placed = { x: number; z: number; theta: number }

/** The stones fan out in front of the tower, toward the plaza. */
export function stonePlaces(n: number): Placed[] {
  return Array.from({ length: n }, (_, k) => {
    // Mirrored so that, seen from the arrival ring, the stones read left to right in CV order.
    const theta = deg(180 - (k - (n - 1) / 2) * STONE.spread)
    return { x: T.x + STONE.r * Math.cos(theta), z: T.z + STONE.r * Math.sin(theta), theta }
  })
}
