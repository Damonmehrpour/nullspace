import { describe, expect, it } from 'vitest'
import { isTypingTarget } from '../../src/core/input'

describe('isTypingTarget', () => {
  it.each(['input', 'textarea', 'select'])('is true for %s', (tag) => {
    expect(isTypingTarget(document.createElement(tag))).toBe(true)
  })

  it('is true inside a contenteditable', () => {
    const host = document.createElement('div')
    host.setAttribute('contenteditable', 'true')
    const child = document.createElement('span')
    host.appendChild(child)
    document.body.appendChild(host)
    expect(isTypingTarget(child)).toBe(true)
    host.remove()
  })

  it('is false for buttons, the body and null', () => {
    expect(isTypingTarget(document.createElement('button'))).toBe(false)
    expect(isTypingTarget(document.body)).toBe(false)
    expect(isTypingTarget(null)).toBe(false)
  })
})
