import { describe, expect, it } from 'vitest'
import { WORLD } from '../../src/content/world'
import { distToSegment, v } from '../../src/core/geometry'
import { createKeyboardInput, type InputState } from '../../src/core/input'
import { createPlayer, stepPlayer, type PlayerState } from '../../src/core/playerMotion'
import { createWalkable } from '../../src/core/walkable'

const walk = createWalkable(WORLD)
const none: InputState = { up: false, down: false, left: false, right: false, interact: false }
const up: InputState = { ...none, up: true }
const DT = 1 / 60

function run(s: PlayerState, input: InputState, seconds: number, yaw = 0) {
  const events: string[] = []
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    const r = stepPlayer(s, input, yaw, DT, walk, false)
    s = r.state
    events.push(...r.events)
  }
  return { s, events }
}

const centre = WORLD.islands[0].centre
const at = (pos: { x: number; z: number }): PlayerState => ({ ...createPlayer(WORLD), pos })

describe('stepPlayer', () => {
  it('reaches nearly full speed within a second', () => {
    const { s } = run(at(centre), up, 1)
    expect(v.len(s.vel)).toBeGreaterThanOrEqual(3.9)
  })

  it('comes to rest shortly after release', () => {
    let { s } = run(at(centre), up, 1)
    s = run(s, none, 0.25).s
    expect(v.len(s.vel)).toBeLessThan(0.1)
  })

  it('moves relative to the camera yaw', () => {
    const { s } = run(at(centre), up, 0.5, Math.PI / 2)
    const d = v.sub(s.pos, centre)
    expect(d.z).toBeGreaterThan(Math.abs(d.x) * 5)
  })

  it('emits boundary once after 0.6 s of pushing into an edge, then not again until released', () => {
    const edge = v.add(centre, v.scale(v.normalize(centre), WORLD.islands[0].radius - 0.05))
    const outwardYaw = v.angleOf(v.normalize(centre))
    let r = run(at(edge), up, 0.5, outwardYaw)
    expect(r.events).toEqual([])
    r = run(r.s, up, 0.5, outwardYaw)
    expect(r.events).toEqual(['boundary'])
    r = run(r.s, up, 2, outwardYaw)
    expect(r.events).toEqual([])
    r = run(r.s, none, 0.5, outwardYaw)
    r = run(r.s, up, 1, outwardYaw)
    expect(r.events).toEqual(['boundary'])
  })

  it('freezes while paused', () => {
    const s0 = { ...at(centre), vel: { x: 3, z: 0 } }
    const r = stepPlayer(s0, up, 0, DT, walk, true)
    expect(r.state.pos).toEqual(centre)
    expect(v.len(r.state.vel)).toBe(0)
  })

  it('a 5 second frame from a walkway edge stays walkable (dt is clamped)', () => {
    const w = WORLD.walkways[0]
    const start = v.add(v.lerp(w.a, w.b, 0.5), { x: 0, z: 0 })
    const s0 = { ...at(start), vel: { x: 4, z: 4 } }
    const r = stepPlayer(s0, up, 0, 5, walk, false)
    expect(walk.contains(r.state.pos)).toBe(true)
    expect(v.dist(r.state.pos, start)).toBeLessThanOrEqual(0.4 + 1e-6)
  })

  it('walking sideways off the bridge keeps the player on it, sliding along the edge', () => {
    const { a, b, halfWidth } = WORLD.bridge
    const mid = v.lerp(a, b, 0.5)
    const sideYaw = v.angleOf(v.sub(b, a)) + Math.PI / 2
    const { s, events } = run(at(mid), up, 3, sideYaw)
    expect(distToSegment(s.pos, a, b)).toBeLessThanOrEqual(halfWidth + 1e-3)
    expect(events).toEqual(['boundary'])
  })

  it('every frame of a diagonal push from the bridge end stays walkable', () => {
    const { a, b } = WORLD.bridge
    let s = at(v.lerp(a, b, 0.9))
    const contact = WORLD.islands.find((i) => i.id === 'contact')!
    const yaw = v.angleOf(v.sub(contact.centre, s.pos))
    for (let i = 0; i < 300; i++) {
      s = stepPlayer(s, up, yaw, DT, walk, false).state
      expect(walk.contains(s.pos)).toBe(true)
    }
  })
})

describe('keyboard input', () => {
  it('maps WASD and arrows and ignores typing targets', () => {
    const input = createKeyboardInput(window)
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }))
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft' }))
    expect(input.state.up).toBe(true)
    expect(input.state.left).toBe(true)
    const field = document.createElement('input')
    document.body.appendChild(field)
    field.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD', bubbles: true }))
    expect(input.state.right).toBe(false)
    field.remove()
    input.dispose()
  })

  it('does not treat Enter on a focused button as an interaction', () => {
    const input = createKeyboardInput(window)
    const button = document.createElement('button')
    document.body.appendChild(button)
    button.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter', bubbles: true }))
    expect(input.state.interact).toBe(false)
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' }))
    expect(input.state.interact).toBe(true)
    button.remove()
    input.dispose()
  })

  it('clears held keys when the window loses focus', () => {
    const input = createKeyboardInput(window)
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }))
    window.dispatchEvent(new Event('blur'))
    expect(input.state.up).toBe(false)
    input.dispose()
  })

  it('clear() then stepping gives no movement even though the key was held', () => {
    const input = createKeyboardInput(window)
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }))
    input.clear()
    const { s } = run(at(centre), input.state, 0.5)
    expect(v.len(s.vel)).toBeLessThan(1e-6)
    input.dispose()
  })
})
