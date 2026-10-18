import { describe, expect, it } from 'vitest'
import { cv } from '../../src/content/cv'
import { honorPlaques } from '../../src/world/v2/projectsAtrium'

describe('honour plaques (Projects atrium wall)', () => {
  const plaques = honorPlaques(cv.projects.honors)

  it('engraves every honour from the CV, in order', () => {
    expect(plaques.map((p) => p.title)).toEqual(['Grand Tour XR', 'WasteGo', 'Who Are You?'])
  })

  it('uses the CV wording exactly and omits a year that is still pending', () => {
    expect(plaques[0]).toEqual({ title: 'Grand Tour XR', award: 'Winner, Immersive Travel & Destination Track', event: 'XRCC Hackathon 2025' })
    expect(plaques[1]).toEqual({ title: 'WasteGo', award: '4th place', event: 'ScaleHack AI Hackathon' })
    expect(plaques[2]).toEqual({ title: 'Who Are You?', award: 'VR project lead', event: 'University of Oulu Summer School 2024' })
  })

  it('leaves out an honour whose award is still pending', () => {
    expect(honorPlaques([{ project: 'X', award: { state: 'pending' }, event: 'E', year: { state: 'confirmed', value: '2020' }, detail: { state: 'pending' }, areas: [] }])).toEqual([])
  })
})
