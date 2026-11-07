import type { PortalStyle } from './experienceChapters'

// The Experience corridor's layout, shared by its meshes (ExperienceV2) and its colliders.
// Island-local space: +x points outward along the path, z across it.

export type Spec = { x: number; H: number; W: number; jw: number; D: number }
export const SPECS: Record<Exclude<PortalStyle, 'generic'>, Spec> = {
  // Spaced evenly (≈ 1.45 m) from the arrival ring to the island's edge, oldest first.
  medrick: { x: -0.7, H: 3.6, W: 1.8, jw: 0.6, D: 0.7 },
  ubicomp: { x: 0.75, H: 4.1, W: 2.0, jw: 0.62, D: 0.6 },
  oasis: { x: 2.2, H: 4.6, W: 2.9, jw: 0.35, D: 0.8 },
  arvo: { x: 3.65, H: 5.3, W: 2.3, jw: 0.7, D: 0.75 },
  // The newest chapter, at the edge facing the void: a lower gate under a pitched, sauna-like gable.
  sammi: { x: 5.0, H: 3.6, W: 1.9, jw: 0.45, D: 0.6 },
}
/** The Sämmi gate's gable: two roof slabs above the lintel, meeting at a ridge along the path. */
export const GABLE = { pitch: (30 * Math.PI) / 180, overhang: 0.12, t: 0.12 }
export const LINTEL = 0.75
export const STELE = { x: 0.05, z: 1.85 }
