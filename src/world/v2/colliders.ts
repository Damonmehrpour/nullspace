// The world's solid structures as lightweight 2D colliders (boxes, pillars and ring-wall sectors), built
// from the same layout data as the meshes, so the two can't drift apart. Only what stands at walking
// height counts: floating rings, lintels, cantilevers and the monolith's glow don't; neither do the
// low district name plaques in the Data City, which are walk-up markers on the path to the arrival ring.

import { cv } from '../../content/cv'
import { PROJECT_SLOTS, type IslandDef, type WorldLayout } from '../../content/world'
import { v, type Vec2 } from '../../core/geometry'
import type { Obstacle } from '../../core/obstacles'
import { contactStones } from './contactSignal'
import { STONE, stonePlaces, T } from './contactLayout'
import { experienceChapters } from './experienceChapters'
import { SPECS, STELE } from './experienceLayout'
import { ARCS, deg, SLOT_R, SLOT_ANGLES, TIERS } from './projectsAtrium'
import { EXHIBIT } from './sanaSauna'
import { skillDistricts } from './skillDistricts'
import { placeBuildings, PLATE, plateWidth, TABLET, tabletSpot } from './skillsCity'

// Kept in step with EducationV2's archive mass (stair, cheeks, back wall) and its sliding spines.
export const ARCHIVE = { x0: 0.4, x1: 6.3, z: 2.8 }
// Kept in step with MonolithV2: a 3.2 × 1.3 m slab turned by π/5, standing just above the plinth.
export const MONOLITH = { hx: 1.6, hz: 0.65, yaw: Math.PI / 5 }
/** The moon gate's round opening, at walking height: free across |z| below this. */
const MOON_OPENING = 0.9
const PLINTH_R = 0.62

type Local = (o: Obstacle) => Obstacle

/** Maps island-local obstacles (+x outward) into world space. */
function islandFrame(island: IslandDef): Local {
  const a = v.angleOf(island.centre)
  const toWorld = (p: Vec2): Vec2 => ({ x: island.centre.x + p.x * Math.cos(a) - p.z * Math.sin(a), z: island.centre.z + p.x * Math.sin(a) + p.z * Math.cos(a) })
  return (o) => (o.kind === 'box' ? { ...o, c: toWorld(o.c), yaw: o.yaw + a } : o.kind === 'circle' ? { ...o, c: toWorld(o.c) } : { ...o, c: toWorld(o.c), a0: o.a0 + a, a1: o.a1 + a })
}

/** A box from extents in a frame (x along, z across, both axis-aligned before turning). */
const span = (x0: number, x1: number, z0: number, z1: number): Obstacle => ({ kind: 'box', c: { x: (x0 + x1) / 2, z: (z0 + z1) / 2 }, hx: (x1 - x0) / 2, hz: (z1 - z0) / 2, yaw: 0 })

function education(): Obstacle[] {
  return [span(ARCHIVE.x0, ARCHIVE.x1, -ARCHIVE.z, ARCHIVE.z)]
}

function experience(): Obstacle[] {
  const out: Obstacle[] = []
  const chapters = experienceChapters(cv.experience.entries)
  for (const c of chapters) {
    if (c.minor || c.style === 'generic') continue
    const s = SPECS[c.style]
    const half = s.W / 2 + s.jw
    const open = c.style === 'oasis' ? MOON_OPENING : s.W / 2
    // The two jambs (or the moon gate's sides); the opening between them stays clear.
    out.push(span(s.x - s.D / 2, s.x + s.D / 2, open, half), span(s.x - s.D / 2, s.x + s.D / 2, -half, -open))
  }
  if (chapters.some((c) => c.minor)) out.push(span(STELE.x - 0.13, STELE.x + 0.13, STELE.z - 0.45, STELE.z + 0.45))
  return out
}

function projects(): Obstacle[] {
  const r0 = Math.min(...TIERS.map((t) => t[0]))
  const r1 = Math.max(...TIERS.map((t) => t[1]))
  return [
    // The stepped terraces (and the honour wall standing on them) around the rim.
    ...ARCS.map(([a0, a1]): Obstacle => ({ kind: 'arc', c: { x: 0, z: 0 }, r0, r1, a0: deg(a0), a1: deg(a1) })),
    // The three plinths; the artifacts are read from beside them.
    ...SLOT_ANGLES.map((a): Obstacle => ({ kind: 'circle', c: { x: SLOT_R * Math.cos(deg(a)), z: SLOT_R * Math.sin(deg(a)) }, r: PLINTH_R })),
    // The word-game exhibit (cabin and board on their base), turned to face the atrium's centre.
    ...PROJECT_SLOTS.slice(SLOT_ANGLES.length).map((s): Obstacle => {
      const c = { x: s.r * Math.cos(deg(s.angle)), z: s.r * Math.sin(deg(s.angle)) }
      return { kind: 'box', c, hx: EXHIBIT.base.d / 2, hz: EXHIBIT.base.w / 2, yaw: deg(s.angle) + Math.PI }
    }),
  ]
}

function skills(): Obstacle[] {
  const out: Obstacle[] = []
  for (const dist of skillDistricts(cv.skills.groups)) {
    const plinth = dist.style === 'languages' ? 0.1 : dist.style === 'tools' ? 0.08 : dist.style === 'game' ? 0.14 : 0.1
    for (const b of placeBuildings(dist)) {
      const face = b.theta + Math.PI // the building's +x faces the plaza
      out.push({ kind: 'box', c: { x: b.x, z: b.z }, hx: (b.d + plinth) / 2, hz: (b.w + plinth) / 2, yaw: face })
      if (dist.style === 'languages') continue
      // Its slanted label plate and stand, in front of it.
      const off = b.d / 2 + PLATE.gap
      out.push({ kind: 'box', c: { x: b.x + Math.cos(face) * off, z: b.z + Math.sin(face) * off }, hx: 0.24, hz: plateWidth(dist.style) / 2, yaw: face })
    }
  }
  // The Languages tablet on its stand.
  const t = tabletSpot()
  out.push({ kind: 'box', c: { x: t.x, z: t.z }, hx: (TABLET.h * Math.sin(TABLET.tilt)) / 2 + 0.03, hz: TABLET.w / 2, yaw: t.theta })
  return out
}

function contact(): Obstacle[] {
  const out: Obstacle[] = [{ kind: 'circle', c: { x: T.x, z: T.z }, r: 1.34 }] // the tower's octagonal plinth and house
  const back = STONE.h * Math.sin(STONE.lean) // each stone leans back toward the tower
  for (const s of stonePlaces(contactStones(cv.contact.channels).length)) {
    const dir = v.fromAngle(s.theta)
    const mid = (STONE.d / 2 - back) / 2
    out.push({ kind: 'box', c: v.add({ x: s.x, z: s.z }, v.scale(dir, mid)), hx: (STONE.d / 2 + back) / 2, hz: STONE.w / 2, yaw: s.theta })
  }
  return out
}

const BY_ISLAND = { education, experience, projects, skills, contact }

/** Every solid structure in the world, in world space. */
export function worldColliders(layout: WorldLayout): Obstacle[] {
  const out: Obstacle[] = [{ kind: 'box', c: layout.monolith.centre, hx: MONOLITH.hx, hz: MONOLITH.hz, yaw: -MONOLITH.yaw }]
  for (const island of layout.islands) out.push(...BY_ISLAND[island.id]().map(islandFrame(island)))
  return out
}
