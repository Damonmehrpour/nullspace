import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readJSON, writeJSON } from '../../src/core/safeStorage'
import { initialState, useStore } from '../../src/state/store'
import { ErrorFallback } from '../../src/ui/ErrorFallback'
import { WorldHost } from '../../src/ui/WorldHost'
import { consumeEnter3dFlag, ENTER3D_FLAG, markContextLost, registerWorldContext, resetContextLoss, type WorldModule } from '../../src/ui/worldLoader'

const ok: WorldModule = { default: () => <p>WORLD OK</p> }

beforeEach(() => {
  sessionStorage.clear()
  resetContextLoss()
  useStore.setState({ ...initialState(), phase: 'loading3d' })
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('WorldHost', () => {
  it('shows the loading state while the chunk loads', () => {
    render(<WorldHost importer={() => new Promise(() => {})} />)
    expect(screen.getByText(/materializing void/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'View Portfolio instead' })).toBeInTheDocument()
  })

  it('retries with a fresh import after a failed load', async () => {
    const importer = vi.fn<() => Promise<WorldModule>>().mockRejectedValueOnce(new Error('Failed to fetch dynamically imported module')).mockResolvedValue(ok)
    render(<WorldHost importer={importer} />)
    await userEvent.click(await screen.findByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('WORLD OK')).toBeInTheDocument()
    expect(importer).toHaveBeenCalledTimes(2)
  })

  it('offers Reload and retry after a second failure, keeping View Portfolio', async () => {
    const importer = vi.fn<() => Promise<WorldModule>>().mockRejectedValue(new Error('Failed to fetch dynamically imported module'))
    const reload = vi.fn()
    render(<WorldHost importer={importer} reload={reload} />)
    await userEvent.click(await screen.findByRole('button', { name: 'Retry' }))
    const reloadBtn = await screen.findByRole('button', { name: 'Reload and retry' })
    expect(screen.getByRole('button', { name: 'View Portfolio' })).toBeInTheDocument()
    await userEvent.click(reloadBtn)
    expect(reload).toHaveBeenCalledTimes(1)
    expect(readJSON(ENTER3D_FLAG, false, 'session')).toBe(true)
  })

  it('View Portfolio leaves the failed world', async () => {
    render(<WorldHost importer={() => Promise.reject(new Error('Failed to fetch dynamically imported module'))} />)
    await userEvent.click(await screen.findByRole('button', { name: 'View Portfolio' }))
    expect(useStore.getState().phase).toBe('portfolio')
  })
})

describe('context loss classification', () => {
  it('a crash right after a context loss shows the context-loss fallback, not the generic crash', async () => {
    const Crashing = () => {
      markContextLost()
      throw new Error('Cannot read properties of null (reading precision)')
    }
    render(<WorldHost importer={() => Promise.resolve({ default: Crashing })} />)
    expect(await screen.findByText('The graphics context was lost.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'View Portfolio' })).toBeInTheDocument()
  })

  it('detects a lost context even before the browser’s context-lost event arrives', async () => {
    registerWorldContext({ isContextLost: () => true })
    const Crashing = () => {
      throw new Error('Cannot read properties of null (reading precision)')
    }
    render(<WorldHost importer={() => Promise.resolve({ default: Crashing })} />)
    expect(await screen.findByText('The graphics context was lost.')).toBeInTheDocument()
  })

  it('an unrelated crash still shows the generic copy', async () => {
    const Crashing = () => {
      throw new Error('boom')
    }
    render(<WorldHost importer={() => Promise.resolve({ default: Crashing })} />)
    expect(await screen.findByText('The simulation collapsed. Typical.')).toBeInTheDocument()
  })
})

describe('ErrorFallback', () => {
  it('uses the crash copy and both buttons', async () => {
    const onRetry = vi.fn()
    render(<ErrorFallback reason="crash" onRetry={onRetry} />)
    expect(screen.getByText('The simulation collapsed. Typical.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalled()
  })
})

describe('consumeEnter3dFlag', () => {
  it('returns true once and clears the flag', () => {
    writeJSON(ENTER3D_FLAG, true, 'session')
    expect(consumeEnter3dFlag()).toBe(true)
    expect(consumeEnter3dFlag()).toBe(false)
  })
})
