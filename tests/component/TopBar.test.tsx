import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { PanelHost } from '../../src/ui/Panel/PanelHost'
import { TopBar } from '../../src/ui/TopBar'
import { useGlobalShortcuts } from '../../src/ui/useGlobalShortcuts'
import { initialState, useStore } from '../../src/state/store'

function Shell({ mode = 'portfolio' as const }: { mode?: 'world' | 'portfolio' | 'entry' }) {
  useGlobalShortcuts()
  return (
    <>
      <div id="app-background">
        <TopBar mode={mode} />
        <input aria-label="Search" />
      </div>
      <PanelHost />
    </>
  )
}

beforeEach(() => useStore.setState(initialState()))

describe('global shortcuts', () => {
  it('number keys open sections', async () => {
    render(<Shell />)
    await userEvent.keyboard('3')
    expect(useStore.getState().panel).toEqual({ kind: 'section', id: 'projects' })
  })

  it('are ignored while typing in an input', async () => {
    render(<Shell />)
    await userEvent.click(screen.getByLabelText('Search'))
    await userEvent.keyboard('3')
    expect(useStore.getState().panel).toBeNull()
  })

  it('are ignored while a panel is open, and Esc closes it', async () => {
    render(<Shell />)
    await userEvent.keyboard('1')
    await userEvent.keyboard('2')
    expect(useStore.getState().panel).toEqual({ kind: 'section', id: 'education' })
    await userEvent.keyboard('{Escape}')
    expect(useStore.getState().panel).toBeNull()
  })
})

describe('TopBar', () => {
  it('opens Contact in one click', async () => {
    render(<Shell />)
    await userEvent.click(screen.getByRole('button', { name: 'Contact' }))
    expect(useStore.getState().panel).toEqual({ kind: 'section', id: 'contact' })
    expect(screen.getByRole('dialog', { name: 'Contact' })).toBeInTheDocument()
  })

  it('offers no CV download anywhere in the top bar', () => {
    render(<Shell />)
    expect(screen.queryByText(/résumé|resume|download/i)).toBeNull()
  })

  it('in world mode shows read and reached marks independently', async () => {
    useStore.setState({ viewed: new Set(['education']), worldVisited: new Set() })
    render(<Shell mode="world" />)
    await userEvent.click(screen.getByRole('button', { name: 'Sections' }))
    const row = screen.getByRole('listitem', { name: /education/i })
    expect(within(row).getByText('read')).toBeInTheDocument()
    expect(within(row).queryByText('reached')).toBeNull()
    expect(screen.getByText('reached 0/5')).toBeInTheDocument()
  })
})

