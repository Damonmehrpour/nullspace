import type { District, DistrictStyle } from './skillDistricts'

// The Data City's layout, shared by its meshes (SkillsV2) and its colliders. Island-local space:
// +x points outward; angles are measured from +x toward +z.

export const deg = (d: number) => (d * Math.PI) / 180
export type Place = { centre: number; span: number; r: number }
export const PLACES: Record<DistrictStyle, Place> = {
  game: { centre: -62, span: 68, r: 4.75 },
  xr: { centre: 0, span: 44, r: 4.95 },
  ai: { centre: 62, span: 68, r: 4.75 },
  // Both supporting districts sit between the walkway entrances (126° ± 20° either side), with clear
  // floor between them: the tools plates end near 166°, the Languages tablet starts near 178°.
  tools: { centre: 155, span: 22, r: 4.6 },
  languages: { centre: 195, span: 30, r: 4.85 },
}
export type Size = { w: number; d: number; base: number; peak: number }
export const SIZES: Record<DistrictStyle, Size> = {
  game: { w: 0.66, d: 0.7, base: 1.5, peak: 1.3 },
  xr: { w: 0.52, d: 0.55, base: 2.4, peak: 1.7 },
  ai: { w: 0.62, d: 0.66, base: 2.0, peak: 1.4 },
  tools: { w: 0.8, d: 0.6, base: 0.75, peak: 0 },
  languages: { w: 0.5, d: 0.16, base: 1.35, peak: 0 },
}
export const SIGN_R = 2.55 // name stones stand on this circle, at the plaza's edge
export const STAGGER = 0.38 // alternate buildings step back, so each district layers into a skyline
export const PLATE = { w: 0.92, h: 0.56, tilt: deg(50), gap: 0.42 } // slanted label plate in front of each building
/** Plate width per district: the two tools plates stand close together, so theirs are narrower. */
export const plateWidth = (style: DistrictStyle) => (style === 'tools' ? 0.78 : PLATE.w)
/** Languages share one wide tablet (a cell per language) instead of crowded plates per stone. */
export const TABLET = { w: 2.3, h: 1.05, tilt: deg(55), r: 4.0, y: 0.6 }
/** District name plaques lie low and slanted, so they never hide the skill plates behind them. */
export const SIGN = { w: 1.75, h: 0.42, tilt: deg(60), y: 0.3 }
/**
 * Where each district's plaque stands. The skyline districts' plaques ring the plaza; the two supporting
 * districts' plaques stand right in front of their own displays, narrower, so they sit clear of the
 * arrival ring and of each other (about 0.8 m apart) instead of crowding the entrance.
 */
export function signLayout(style: DistrictStyle): { r: number; w: number } {
  return style === 'tools' || style === 'languages' ? { r: 3.35, w: 1.5 } : { r: SIGN_R, w: SIGN.w }
}
export type Spot = { x: number; z: number; theta: number }
export type Building = { x: number; z: number; yaw: number; theta: number; w: number; d: number; h: number; label: string }

/** One building per skill, spread across the district's arc; the skyline rises toward its middle. */
export function placeBuildings(dist: District): Building[] {
  const place = PLACES[dist.style]
  const size = SIZES[dist.style]
  const n = dist.items.length
  return dist.items.map((label, k) => {
    const theta = deg(place.centre - place.span / 2 + (place.span * (k + 0.5)) / n)
    const off = n > 1 ? ((k + 0.5) / n) * 2 - 1 : 0
    // The skyline rises toward each district's middle; a small alternating step keeps it lively.
    const h = size.base + size.peak * (1 - Math.abs(off) ** 1.5) + (size.peak > 0 ? (k % 2 ? -0.18 : 0.18) : 0)
    const r = place.r + (size.peak > 0 && k % 2 ? STAGGER : 0)
    return { x: r * Math.cos(theta), z: r * Math.sin(theta), yaw: -(theta + Math.PI), theta, w: size.w, d: size.d, h, label }
  })
}

/** The district's name plaque, at the plaza's edge on the district's centre bearing. */
export function signSpot(style: DistrictStyle): Spot {
  const st = deg(PLACES[style].centre)
  const { r } = signLayout(style)
  return { x: r * Math.cos(st), z: r * Math.sin(st), theta: st }
}

/** The Languages tablet, in front of its standing stones. */
export function tabletSpot(): Spot {
  const st = deg(PLACES.languages.centre)
  return { x: TABLET.r * Math.cos(st), z: TABLET.r * Math.sin(st), theta: st }
}
