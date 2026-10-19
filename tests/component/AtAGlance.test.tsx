import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { cv } from '../../src/content/cv'
import { AtAGlance } from '../../src/portfolio/AtAGlance'

describe('portfolio at a glance (for a recruiter in a hurry)', () => {
  it('summarises the most recent role, the degree, location and availability from the CV', () => {
    render(<AtAGlance cv={cv} />)
    const card = screen.getByRole('region', { name: 'At a glance' })
    expect(within(card).getByText('Lead XR Engineer')).toBeInTheDocument()
    expect(within(card).getByText(/ARVO/)).toBeInTheDocument()
    expect(within(card).getByText(/08\/2025 – 11\/2025/)).toBeInTheDocument()
    expect(within(card).getByText('MSc in Computer Science and Engineering')).toBeInTheDocument()
    expect(within(card).getByText(/University of Oulu/)).toBeInTheDocument()
    expect(within(card).getByText('Oulu, Finland')).toBeInTheDocument()
    expect(within(card).getByText('Open to remote work and relocation opportunities')).toBeInTheDocument()
  })

  it('links every public contact channel and jumps to every section', () => {
    render(<AtAGlance cv={cv} />)
    const card = screen.getByRole('region', { name: 'At a glance' })
    expect(within(card).getByRole('link', { name: 'damons3m@gmail.com' })).toHaveAttribute('href', 'mailto:damons3m@gmail.com')
    expect(within(card).getByRole('link', { name: '+358 45 8629910' })).toHaveAttribute('href', 'tel:+358458629910')
    expect(within(card).getByRole('link', { name: 'GitHub' })).toHaveAttribute('href', 'https://github.com/Damonmehrpour')
    expect(within(card).getByRole('link', { name: 'LinkedIn' })).toHaveAttribute('href', 'https://www.linkedin.com/in/damon-mehrpour-128079250/')
    const jump = within(card).getByRole('navigation', { name: 'Jump to section' })
    for (const [name, href] of [['Education & Research', '#portfolio-education'], ['Experience', '#portfolio-experience'], ['Projects', '#portfolio-projects'], ['Skills', '#portfolio-skills'], ['Contact', '#portfolio-contact']])
      expect(within(jump).getByRole('link', { name })).toHaveAttribute('href', href)
  })
})
