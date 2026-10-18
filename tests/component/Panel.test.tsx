import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { rememberOpener } from '../../src/ui/focusReturn'
import { Panel } from '../../src/ui/Panel/Panel'

function Harness({ removeOpener = false }: { removeOpener?: boolean }) {
  const [open, setOpen] = useState(false)
  const [showOpener, setShowOpener] = useState(true)
  return (
    <>
      <div id="app-background">
        {showOpener && (
          <button
            onClick={(e) => {
              rememberOpener(e.currentTarget)
              setOpen(true)
              if (removeOpener) setShowOpener(false)
            }}
          >
            Open
          </button>
        )}
        <button>Background</button>
      </div>
      {open && (
        <Panel title="Education" onClose={() => setOpen(false)}>
          <a href="#a">First</a>
          <a href="#b">Last</a>
        </Panel>
      )}
    </>
  )
}

describe('Panel', () => {
  it('is a labelled modal dialog that focuses its heading on open', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByText('Open'))
    const dialog = screen.getByRole('dialog', { name: 'Education' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByRole('heading', { name: 'Education' })).toHaveFocus()
  })

  it('traps Tab and Shift+Tab inside', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByText('Open'))
    const dialog = screen.getByRole('dialog')
    for (let i = 0; i < 6; i++) {
      await userEvent.tab()
      expect(dialog.contains(document.activeElement)).toBe(true)
    }
    for (let i = 0; i < 6; i++) {
      await userEvent.tab({ shift: true })
      expect(dialog.contains(document.activeElement)).toBe(true)
    }
  })

  it('Esc closes and focus returns to the opener', async () => {
    render(<Harness />)
    const opener = screen.getByText('Open')
    await userEvent.click(opener)
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(opener).toHaveFocus()
  })

  it('the close button closes the panel', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByText('Open'))
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('falls back to body when the opener was removed from the DOM', async () => {
    render(<Harness removeOpener />)
    await userEvent.click(screen.getByText('Open'))
    await userEvent.keyboard('{Escape}')
    expect(document.activeElement).toBe(document.body)
  })

  it('sets inert on #app-background while open and removes it on close', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByText('Open'))
    expect(document.getElementById('app-background')).toHaveAttribute('inert')
    await userEvent.keyboard('{Escape}')
    expect(document.getElementById('app-background')).not.toHaveAttribute('inert')
  })

  it('keeps focus inside after a viewport resize across 768px', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByText('Open'))
    act(() => {
      window.innerWidth = 500
      fireEvent(window, new Event('resize'))
    })
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true)
  })
})
