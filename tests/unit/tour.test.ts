import { describe, expect, it } from 'vitest'
import { SECTION_IDS, type SectionId } from '../../src/content/schema'
import { WORLD } from '../../src/content/world'
import { v } from '../../src/core/geometry'
import { createZoneTracker, isTourComplete, nextTarget, updateZones } from '../../src/core/tour'

const order = WORLD.tourOrder
const edu = WORLD.islands[0]
const outward = v.normalize(edu.centre)

describe('tour order', () => {
  it('starts at Education', () => {
    expect(nextTarget(order, new Set())).toBe('education')
  })

  it('skips world-visited islands', () => {
    expect(nextTarget(order, new Set<SectionId>(['education', 'projects']))).toBe('experience')
  })

  it('completes only with all five world visits', () => {
    expect(isTourComplete(order, new Set<SectionId>(['education', 'experience', 'projects', 'skills']))).toBe(false)
    expect(isTourComplete(order, new Set<SectionId>(SECTION_IDS))).toBe(true)
    expect(nextTarget(order, new Set<SectionId>(SECTION_IDS))).toBeNull()
  })
})

describe('arrival zones', () => {
  const away = v.add(edu.arrivalPoint, v.scale(outward, 3))

  it('reports an entry once, not while staying inside', () => {
    let t = createZoneTracker(SECTION_IDS)
    let r = updateZones(t, away, WORLD.islands)
    expect(r.entered).toBeNull()
    r = updateZones(r.tracker, edu.arrivalPoint, WORLD.islands)
    expect(r.entered).toBe('education')
    t = r.tracker
    expect(updateZones(t, edu.arrivalPoint, WORLD.islands).entered).toBeNull()
  })

  it('re-arms only after leaving beyond the margin', () => {
    let t = updateZones(createZoneTracker(SECTION_IDS), edu.arrivalPoint, WORLD.islands).tracker
    t = updateZones(t, v.add(edu.arrivalPoint, v.scale(outward, 1.5)), WORLD.islands).tracker
    expect(updateZones(t, edu.arrivalPoint, WORLD.islands).entered).toBeNull()
    t = updateZones(t, v.add(edu.arrivalPoint, v.scale(outward, 2.5)), WORLD.islands).tracker
    expect(updateZones(t, edu.arrivalPoint, WORLD.islands).entered).toBe('education')
  })

  it('a player teleported straight into a zone counts as entering', () => {
    expect(updateZones(createZoneTracker(SECTION_IDS), WORLD.islands[3].arrivalPoint, WORLD.islands).entered).toBe('skills')
  })
})
