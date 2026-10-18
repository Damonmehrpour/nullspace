import { describe, expect, it } from 'vitest'
import { SECTION_IDS } from '../../src/content/schema'
import { buildLayout, WORLD } from '../../src/content/world'
import { distToSegment, v } from '../../src/core/geometry'

describe('world layout', () => {
  it('has one island per section, in tour order', () => {
    expect(WORLD.islands.map((i) => i.id)).toEqual([...SECTION_IDS])
    expect(WORLD.tourOrder).toEqual([...SECTION_IDS])
  })

  it('places adjacent islands about 25.86 m apart on a 22 m ring', () => {
    const [a, b] = WORLD.islands
    expect(v.dist(a.centre, b.centre)).toBeCloseTo(25.86, 1)
    for (const i of WORLD.islands) expect(v.len(i.centre)).toBeCloseTo(22, 5)
  })

  it('gives Projects three artifact slots and the others none', () => {
    for (const i of WORLD.islands) expect(i.artifactSlots).toHaveLength(i.id === 'projects' ? 3 : 0)
  })

  it('connects consecutive islands in a closed loop of five walkways', () => {
    expect(WORLD.walkways.map((w) => `${w.from}>${w.to}`)).toEqual([
      'education>experience',
      'experience>projects',
      'projects>skills',
      'skills>contact',
      'contact>education',
    ])
  })

  it('puts ringEntry on the contact→education walkway and the bridge ends there', () => {
    const w = WORLD.walkways.find((x) => x.from === 'contact' && x.to === 'education')!
    expect(distToSegment(WORLD.ringEntry, w.a, w.b)).toBeLessThan(1e-9)
    expect(v.dist(WORLD.bridge.b, WORLD.ringEntry)).toBeLessThan(1e-9)
  })

  it('places each arrival point 2 m from its island centre towards the monolith', () => {
    for (const i of WORLD.islands) {
      expect(v.dist(i.arrivalPoint, i.centre)).toBeCloseTo(2)
      expect(v.len(i.arrivalPoint)).toBeCloseTo(20)
    }
  })

  it('spawns the player on the plinth facing the ring entry', () => {
    expect(v.len(WORLD.spawn.pos)).toBeCloseTo(2)
    expect(WORLD.spawn.facing).toBeCloseTo(v.angleOf(WORLD.ringEntry))
  })

  it('accepts parameter overrides', () => {
    expect(v.len(buildLayout({ ringRadius: 30 }).islands[0].centre)).toBeCloseTo(30)
  })
})
