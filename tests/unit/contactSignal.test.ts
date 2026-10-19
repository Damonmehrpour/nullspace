import { describe, expect, it } from 'vitest'
import { cv } from '../../src/content/cv'
import { contactStones, contactBase } from '../../src/world/v2/contactSignal'

describe('Contact signal tower (data)', () => {
  it('gives each public channel its own stone, with the CV label and value, in order', () => {
    expect(contactStones(cv.contact.channels)).toEqual([
      { label: 'Email', value: 'damons3m@gmail.com' },
      { label: 'GitHub', value: 'github.com/Damonmehrpour' },
      { label: 'LinkedIn', value: 'linkedin.com/in/damon-mehrpour-128079250' },
    ])
  })

  it('engraves location and availability on the base exactly as the CV states them', () => {
    expect(contactBase(cv.contact)).toEqual(['Oulu, Finland', 'Open to remote work and relocation opportunities'])
  })

  it('never engraves a channel or line that is still pending', () => {
    expect(contactStones([{ kind: 'other', label: 'X', value: { state: 'pending' } }])).toEqual([])
    expect(contactBase({ ...cv.contact, location: { state: 'pending' } })).toEqual(['Open to remote work and relocation opportunities'])
  })
})
