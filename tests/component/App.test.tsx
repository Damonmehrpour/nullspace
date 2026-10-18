import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/App'
import { capabilities } from '../../src/core/capabilities'
import { writeJSON } from '../../src/core/safeStorage'
import { STORAGE_KEYS } from '../../src/state/settings'
import { initialState, useStore } from '../../src/state/store'

beforeEach(() => {
  localStorage.clear()
  writeJSON(STORAGE_KEYS.booted, true)
  useStore.setState(initialState())
  vi.spyOn(capabilities, 'hasWebGL2').mockReturnValue(true)
  vi.spyOn(capabilities, 'isTouchFirst').mockReturnValue(false)
})

describe('App', () => {
  it('portfolio shows all five sections and three project cards', () => {
    useStore.setState({ phase: 'portfolio' })
    render(<App />)
    for (const title of ['Education', 'Experience', 'Projects', 'Skills', 'Contact']) {
      expect(screen.getByRole('heading', { level: 2, name: title })).toBeInTheDocument()
    }
    expect(screen.getAllByRole('button', { name: /open project/i })).toHaveLength(3)
  })

  it('a portfolio project card opens its detail in the panel', async () => {
    useStore.setState({ phase: 'portfolio' })
    render(<App />)
    await userEvent.click(screen.getAllByRole('button', { name: /open project/i })[0])
    expect(screen.getByRole('dialog', { name: 'XR Meditation System' })).toBeInTheDocument()
  })

  it('from the entry screen Contact opens in one click', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Contact' }))
    expect(screen.getByRole('dialog', { name: 'Contact' })).toBeInTheDocument()
    expect(screen.getByText('Résumé: coming soon', { selector: '[role="dialog"] *' })).toBeInTheDocument()
  })

  it('viewing every portfolio section never touches worldVisited', () => {
    useStore.setState({ phase: 'portfolio' })
    render(<App />)
    for (const id of ['education', 'experience', 'projects', 'skills', 'contact'] as const) useStore.getState().openSection(id, { source: 'portfolio' })
    expect(useStore.getState().viewed.size).toBe(5)
    expect(useStore.getState().worldVisited.size).toBe(0)
  })
})
