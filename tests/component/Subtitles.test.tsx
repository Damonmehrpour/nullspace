import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { capabilities } from '../../src/core/capabilities'
import { initialState, useStore } from '../../src/state/store'
import { A11yStatus } from '../../src/ui/A11yStatus'
import { ControlsHint } from '../../src/ui/ControlsHint'
import { Subtitles } from '../../src/ui/Subtitles'

const LINE = 'The void is not a shortcut.'

beforeEach(() => {
  vi.useFakeTimers()
  useStore.setState({ ...initialState(), phase: 'world' })
  vi.spyOn(capabilities, 'isTouchFirst').mockReturnValue(false)
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} }))
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const visible = () => screen.getByTestId('subtitle-text').textContent

describe('Subtitles', () => {
  it('types the line out while the live region gets the full text at once', () => {
    render(<Subtitles />)
    act(() => useStore.getState().say(LINE))
    expect(screen.getByText('KOKEDAMA ›')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(LINE)
    act(() => vi.advanceTimersByTime(250))
    expect(visible()!.length).toBeGreaterThan(0)
    expect(visible()!.length).toBeLessThan(LINE.length)
    act(() => vi.advanceTimersByTime(1000))
    expect(visible()).toBe(LINE)
  })

  it('Space completes the line, but not while typing in a field', () => {
    render(
      <>
        <input aria-label="field" />
        <Subtitles />
      </>,
    )
    act(() => useStore.getState().say(LINE))
    fireEvent.keyDown(screen.getByLabelText('field'), { key: ' ', code: 'Space' })
    expect(visible()).not.toBe(LINE)
    fireEvent.keyDown(window, { key: ' ', code: 'Space' })
    expect(visible()).toBe(LINE)
  })

  it('shows the full line at once when typing is off', () => {
    useStore.setState({ settings: { ...useStore.getState().settings, typing: false } })
    render(<Subtitles />)
    act(() => useStore.getState().say(LINE))
    expect(visible()).toBe(LINE)
  })

  it('shows the full line at once with reduced motion', () => {
    useStore.setState({ settings: { ...useStore.getState().settings, reducedMotion: 'on' } })
    render(<Subtitles />)
    act(() => useStore.getState().say(LINE))
    expect(visible()).toBe(LINE)
  })

  it('fades out after 2.5 s plus 40 ms per character', () => {
    render(<Subtitles />)
    act(() => useStore.getState().say(LINE))
    act(() => vi.advanceTimersByTime(2500 + 40 * LINE.length + 50))
    expect(screen.queryByTestId('subtitle-text')).toBeNull()
  })

  it('renders nothing visible with subtitles off, while navigation guidance is still announced', () => {
    useStore.setState({ settings: { ...useStore.getState().settings, subtitles: false } })
    render(
      <>
        <Subtitles />
        <A11yStatus />
      </>,
    )
    act(() => useStore.getState().say(LINE))
    expect(screen.queryByText('KOKEDAMA ›')).toBeNull()
    act(() => useStore.getState().setTourTarget('education'))
    expect(screen.getByTestId('a11y-status')).toHaveTextContent('Next destination: Education & Research. Follow the guide or press 1 to open.')
  })

  it('is hidden while a panel is open on a narrow screen', () => {
    window.innerWidth = 375
    render(<Subtitles />)
    act(() => useStore.getState().openSection('skills', { source: 'quicknav' }))
    act(() => useStore.getState().say(LINE))
    expect(screen.queryByTestId('subtitle-text')).toBeNull()
    window.innerWidth = 1024
  })
})

describe('A11yStatus', () => {
  it('announces when every destination is reached', () => {
    render(<A11yStatus />)
    act(() => useStore.setState({ worldVisited: new Set(['education', 'experience', 'projects', 'skills', 'contact']), tourTarget: null }))
    expect(screen.getByTestId('a11y-status')).toHaveTextContent('All destinations reached.')
  })
})

describe('ControlsHint (controls card)', () => {
  it('lists every desktop control, hides after a while, and reopens from the Controls button', () => {
    render(<ControlsHint />)
    const card = screen.getByRole('region', { name: 'Controls' })
    for (const row of ['Move', 'Look around', 'Zoom', 'Recenter camera', 'Interact', 'Close']) expect(within(card).getByText(row)).toBeInTheDocument()
    expect(within(card).getByText(/drag/i)).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(14_100))
    expect(screen.queryByRole('region', { name: 'Controls' })).toBeNull()
    act(() => useStore.getState().setControlsOpen(true))
    expect(screen.getByRole('region', { name: 'Controls' })).toBeInTheDocument()
  })

  it('tells touch visitors how to look around and travel', () => {
    vi.mocked(capabilities.isTouchFirst).mockReturnValue(true)
    render(<ControlsHint />)
    const card = screen.getByRole('region', { name: 'Controls' })
    expect(within(card).getByText(/Drag to look around/)).toBeInTheDocument()
    expect(within(card).getByText(/Pinch to zoom/)).toBeInTheDocument()
    expect(within(card).getByText(/Sections/)).toBeInTheDocument()
  })
})
