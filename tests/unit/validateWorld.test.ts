import { describe, expect, it } from 'vitest'
import { SECTION_IDS } from '../../src/content/schema'
import { buildLayout, WORLD, type WorldLayout } from '../../src/content/world'
import { validateWorld } from '../../src/core/validateWorld'

const rules = (layout: WorldLayout, ids: readonly (typeof SECTION_IDS)[number][] = SECTION_IDS, maxSubstep?: number) =>
  validateWorld(layout, ids, maxSubstep).map((i) => i.rule)

const clone = (): WorldLayout => structuredClone(WORLD)

describe('validateWorld', () => {
  it('accepts the real layout', () => {
    expect(validateWorld(WORLD, SECTION_IDS)).toEqual([])
  })

  it('flags an island pushed away from its walkways', () => {
    const w = clone()
    w.islands[2].centre = { x: w.islands[2].centre.x * 1.7, z: w.islands[2].centre.z * 1.7 }
    w.islands[2].arrivalPoint = { x: w.islands[2].arrivalPoint.x * 1.7, z: w.islands[2].arrivalPoint.z * 1.7 }
    const r = rules(w)
    expect(r.includes('unreachable') || r.includes('edge-outside') || r.includes('node-outside')).toBe(true)
  })

  it('flags an arrival zone that sticks out of its island', () => {
    expect(rules(buildLayout({ arrivalZoneRadius: 7 }))).toContain('zone-outside')
  })

  it('flags Projects without three artifact slots', () => {
    const w = clone()
    w.islands.find((i) => i.id === 'projects')!.artifactSlots.pop()
    expect(rules(w)).toContain('artifact-slots')
  })

  it('flags an artifact slot outside its island', () => {
    const w = clone()
    w.islands.find((i) => i.id === 'projects')!.artifactSlots[0] = { x: 0, z: 0 }
    expect(rules(w)).toContain('slot-outside')
  })

  it('flags a missing island', () => {
    const w = clone()
    w.islands = w.islands.filter((i) => i.id !== 'skills')
    w.walkways = w.walkways.filter((x) => x.from !== 'skills' && x.to !== 'skills')
    expect(rules(w)).toContain('section-missing')
  })

  it('flags a substep that is not smaller than the narrowest strip', () => {
    expect(rules(WORLD, SECTION_IDS, 1.0)).toContain('substep-too-large')
  })
})
