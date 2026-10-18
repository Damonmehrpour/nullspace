import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { capabilities } from '../../src/core/capabilities'
import { initialState, useStore } from '../../src/state/store'
import { ArtifactPrompt } from '../../src/ui/ArtifactPrompt'

beforeEach(() => {
  useStore.setState({ ...initialState(), phase: 'world' })
  vi.spyOn(capabilities, 'isTouchFirst').mockReturnValue(false)
})
afterEach(() => vi.restoreAllMocks())

describe('ArtifactPrompt', () => {
  it('names the nearby project and the key to open it', () => {
    render(<ArtifactPrompt />)
    expect(screen.queryByTestId('artifact-prompt')).toBeNull()
    act(() => useStore.getState().setNearArtifact(0))
    expect(screen.getByTestId('artifact-prompt')).toHaveTextContent('E or Enter · open XR Meditation System')
  })

  it('names the game development artifact', () => {
    render(<ArtifactPrompt />)
    act(() => useStore.getState().setNearArtifact(2))
    expect(screen.getByTestId('artifact-prompt')).toHaveTextContent('open Mobile games at Medrick')
  })

  it('tells touch visitors to tap', () => {
    vi.mocked(capabilities.isTouchFirst).mockReturnValue(true)
    render(<ArtifactPrompt />)
    act(() => useStore.getState().setNearArtifact(1))
    expect(screen.getByTestId('artifact-prompt')).toHaveTextContent('Tap it · open LLM-Driven AI Avatars')
  })
})
