import type { PortalStyle } from './experienceChapters'

// The Experience corridor's layout, shared by its meshes (ExperienceV2) and its colliders.
// Island-local space: +x points outward along the path, z across it.

export type Spec = { x: number; H: number; W: number; jw: number; D: number }
export const SPECS: Record<Exclude<PortalStyle, 'generic'>, Spec> = {
  medrick: { x: -0.7, H: 3.6, W: 1.8, jw: 0.6, D: 0.7 },
  ubicomp: { x: 1.15, H: 4.1, W: 2.0, jw: 0.62, D: 0.6 },
  oasis: { x: 3.0, H: 4.6, W: 2.9, jw: 0.35, D: 0.8 },
  arvo: { x: 4.95, H: 5.3, W: 2.3, jw: 0.7, D: 0.75 },
}
export const LINTEL = 0.75
export const STELE = { x: 0.22, z: 1.85 }
