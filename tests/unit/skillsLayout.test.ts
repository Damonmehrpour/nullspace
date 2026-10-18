import { describe, expect, it } from 'vitest'
import { WORLD } from '../../src/content/world'
import { skillsLayout } from '../../src/world/islands/Skills'

// v1 and v2 both build the Skills grid from skillsLayout (no visual-version branch), so this covers both looks.
describe('skills grid', () => {
  const radius = WORLD.islands.find((i) => i.id === 'skills')!.radius
  const cubes = skillsLayout(radius)
  const at = (x: number, z: number) => cubes.find((c) => Math.abs(c.pos[0] - x) < 1e-6 && Math.abs(c.pos[2] - z) < 1e-6)

  it('gives every cube a positive height, standing on the island', () => {
    for (const c of cubes) {
      expect(c.size[1]).toBeGreaterThan(0)
      expect(c.pos[1]).toBeCloseTo(c.size[1] / 2)
    }
  })

  it('renders the three cells a negative modulo used to hide, at their intended heights', () => {
    // (gx, gz) = (1, −3), (2, −3), (0, −2): height = 0.3 + ((n mod 9) / 9) · 1.8 with a non-negative remainder
    expect(at(0.8 + 1.15, -3 * 1.15)?.size[1]).toBeCloseTo(0.3 + (7 / 9) * 1.8)
    expect(at(0.8 + 2 * 1.15, -3 * 1.15)?.size[1]).toBeCloseTo(0.3 + (5 / 9) * 1.8)
    expect(at(0.8, -2 * 1.15)?.size[1]).toBeCloseTo(0.3 + (4 / 9) * 1.8)
  })
})
