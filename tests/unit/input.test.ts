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

describe('createKeyboardInput: interact', () => {
  it('latches a quick E press until it is read, once', async () => {
    const { createKeyboardInput } = await import('../../src/core/input')
    const input = createKeyboardInput(window)
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' }))
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE' }))
    expect(input.state.interact).toBe(false) // already released before any frame read it
    expect(input.takeInteract()).toBe(true)
    expect(input.takeInteract()).toBe(false)
    // Key repeat while held does not count as new presses.
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter' }))
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter', repeat: true }))
    expect(input.takeInteract()).toBe(true)
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter', repeat: true }))
    expect(input.takeInteract()).toBe(false)
    input.dispose()
  })
})
