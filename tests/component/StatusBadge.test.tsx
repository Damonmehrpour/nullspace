import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { confirmed, pending } from '../../src/content/schema'
import { FieldText } from '../../src/ui/FieldText'
import { StatusBadge } from '../../src/ui/StatusBadge'

describe('StatusBadge', () => {
  it.each([
    ['partial', 'IN DOCUMENTATION'],
    ['pending-content', 'AWAITING DATA'],
    ['placeholder', 'PLACEHOLDER'],
  ] as const)('%s shows %s', (status, copy) => {
    render(<StatusBadge status={status} />)
    expect(screen.getByText(copy)).toBeInTheDocument()
  })

  it('renders nothing for real', () => {
    const { container } = render(<StatusBadge status="real" />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('FieldText', () => {
  it('renders a confirmed string', () => {
    render(<FieldText field={confirmed('Unity')} />)
    expect(screen.getByText('Unity')).toBeInTheDocument()
  })

  it('renders a confirmed array as list items', () => {
    render(<FieldText field={confirmed(['C#', 'Unity'])} />)
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['C#', 'Unity'])
  })

  it('renders nothing for a pending field: visitors never see placeholders', () => {
    const { container } = render(<FieldText field={pending('video coming soon')} />)
    expect(container.textContent).toBe('')
  })
})
