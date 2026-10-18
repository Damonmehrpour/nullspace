import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as caps from '../../src/core/capabilities'
import { writeJSON } from '../../src/core/safeStorage'
import { STORAGE_KEYS } from '../../src/state/settings'
import { initialState, loadInitialState, useStore } from '../../src/state/store'
import { Boot } from '../../src/ui/Boot'
import { Entry, TOUCH_NOTE } from '../../src/ui/Entry'
import App from '../../src/App'

beforeEach(() => {
  localStorage.clear()
  useStore.setState(initialState())
  vi.spyOn(caps.capabilities, 'hasWebGL2').mockReturnValue(true)
  vi.spyOn(caps.capabilities, 'isTouchFirst').mockReturnValue(false)
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('Boot', () => {
  it('finishes after 2500 ms', () => {
    vi.useFakeTimers()
    const onDone = vi.fn()
    render(<Boot onDone={onDone} />)
    act(() => vi.advanceTimersByTime(2499))
    expect(onDone).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(1))
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('has a Skip button from the first frame', () => {
    const onDone = vi.fn()
    render(<Boot onDone={onDone} />)
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('any key skips', () => {
    const onDone = vi.fn()
    render(<Boot onDone={onDone} />)
    fireEvent.keyDown(window, { key: 'x' })
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('records that boot has run', () => {
    render(<Boot onDone={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    expect(localStorage.getItem(STORAGE_KEYS.booted)).toBe('true')
  })
})

describe('Entry', () => {
  it('offers both choices on desktop without the touch note', () => {
    render(<Entry />)
    expect(screen.getByRole('button', { name: 'ENTER SIMULATION' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'VIEW PORTFOLIO' })).toBeInTheDocument()
    expect(screen.queryByText(TOUCH_NOTE)).toBeNull()
  })

  it('on touch-first devices recommends View Portfolio and describes Enter with the keyboard note', () => {
    vi.mocked(caps.capabilities.isTouchFirst).mockReturnValue(true)
    render(<Entry />)
    const buttons = screen.getAllByRole('button')
    expect(buttons[0]).toHaveAccessibleName('VIEW PORTFOLIO')
    expect(screen.getByRole('button', { name: 'ENTER SIMULATION' })).toHaveAccessibleDescription(TOUCH_NOTE)
    expect(TOUCH_NOTE).toBe('3D walking needs a keyboard in this version. View Portfolio has everything.')
  })

  it('disables Enter without WebGL2', () => {
    vi.mocked(caps.capabilities.hasWebGL2).mockReturnValue(false)
    render(<Entry />)
    const enter = screen.getByRole('button', { name: 'ENTER SIMULATION' })
    expect(enter).toBeDisabled()
    expect(enter).toHaveAccessibleDescription("Your browser can't render the simulation.")
  })

  it('View Portfolio switches the phase', () => {
    render(<Entry />)
    fireEvent.click(screen.getByRole('button', { name: 'VIEW PORTFOLIO' }))
    expect(useStore.getState().phase).toBe('portfolio')
    expect(useStore.getState().modePreference).toBe('portfolio')
  })
})

describe('return visits', () => {
  it('skip boot, highlight the remembered choice, and never auto-enter 3D', () => {
    writeJSON(STORAGE_KEYS.booted, true)
    writeJSON(STORAGE_KEYS.mode, 'world')
    useStore.setState(loadInitialState())
    render(<App />)
    expect(screen.queryByRole('button', { name: 'Skip' })).toBeNull()
    const enter = screen.getByRole('button', { name: 'ENTER SIMULATION' })
    expect(enter).toHaveAttribute('data-remembered')
    expect(useStore.getState().phase).toBe('entry')
  })
})
