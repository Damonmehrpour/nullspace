import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { initialState, loadInitialState, useStore } from '../../src/state/store'
import { TopBar } from '../../src/ui/TopBar'

beforeEach(() => {
  localStorage.clear()
  useStore.setState(initialState())
})

function open() {
  render(
    <div id="app-background">
      <TopBar mode="world" />
    </div>,
  )
  return userEvent.click(screen.getByRole('button', { name: 'Settings' }))
}

describe('Settings', () => {
  it('opens as a labelled dialog from the top bar', async () => {
    await open()
    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeInTheDocument()
  })

  it('toggles typing and subtitles, and the choices survive a reload', async () => {
    await open()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Typing effect' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Subtitles' }))
    expect(useStore.getState().settings).toMatchObject({ typing: false, subtitles: false })
    expect(loadInitialState().settings).toMatchObject({ typing: false, subtitles: false })
  })

  it('sets reduced motion and quality', async () => {
    await open()
    await userEvent.click(screen.getByRole('radio', { name: 'On' }))
    await userEvent.click(screen.getByRole('radio', { name: 'Low' }))
    expect(useStore.getState().settings).toMatchObject({ reducedMotion: 'on', quality: 'low' })
    expect(loadInitialState().settings).toMatchObject({ reducedMotion: 'on', quality: 'low' })
  })

  it('reflects the current values when opened', async () => {
    useStore.setState({ settings: { typing: false, reducedMotion: 'off', subtitles: true, quality: 'low' } })
    await open()
    expect(screen.getByRole('checkbox', { name: 'Typing effect' })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: 'Off' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Low' })).toBeChecked()
  })

  it('Esc closes it', async () => {
    await open()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
