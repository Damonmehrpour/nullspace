import { afterEach, describe, expect, it, vi } from 'vitest'
import { readJSON, writeJSON } from '../../src/core/safeStorage'

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('safeStorage', () => {
  it('round-trips JSON values', () => {
    writeJSON('k', { a: 1 })
    expect(readJSON('k', null)).toEqual({ a: 1 })
  })

  it('returns the fallback for a missing key', () => {
    expect(readJSON('missing', 7)).toBe(7)
  })

  it('returns the fallback when getItem throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied')
    })
    expect(readJSON('k', 7)).toBe(7)
  })

  it('returns the fallback for corrupt JSON', () => {
    localStorage.setItem('k', '{not json')
    expect(readJSON('k', 7)).toBe(7)
  })

  it('swallows setItem errors', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    expect(() => writeJSON('k', 1)).not.toThrow()
  })
})
