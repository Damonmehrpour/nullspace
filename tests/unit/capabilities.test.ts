import { afterEach, describe, expect, it, vi } from 'vitest'
import { hasWebGL2, isTouchFirst } from '../../src/core/capabilities'

afterEach(() => vi.restoreAllMocks())

function mockMatchMedia(matches: boolean) {
  vi.stubGlobal('matchMedia', (q: string) => ({ matches, media: q, addEventListener() {}, removeEventListener() {} }))
}

describe('capabilities', () => {
  it('hasWebGL2 is false when the context is unavailable', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    expect(hasWebGL2()).toBe(false)
  })

  it('hasWebGL2 is false when getContext throws', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(hasWebGL2()).toBe(false)
  })

  it('isTouchFirst follows the coarse-pointer query', () => {
    window.innerWidth = 1280
    mockMatchMedia(true)
    expect(isTouchFirst()).toBe(true)
    mockMatchMedia(false)
    expect(isTouchFirst()).toBe(false)
  })

  it('isTouchFirst is true on narrow screens', () => {
    mockMatchMedia(false)
    window.innerWidth = 500
    expect(isTouchFirst()).toBe(true)
    window.innerWidth = 1280
  })
})
