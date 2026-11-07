/** True when a key event comes from a place where the visitor is typing text. */
export function isTypingTarget(t: EventTarget | null): boolean {
  if (!(t instanceof Element)) return false
  if (t.closest('input, textarea, select')) return true
  const editable = t.closest('[contenteditable]')
  return editable !== null && editable.getAttribute('contenteditable') !== 'false'
}

export type InputState = { up: boolean; down: boolean; left: boolean; right: boolean; interact: boolean }

const KEYMAP: Record<string, keyof InputState> = {
  KeyW: 'up',
  ArrowUp: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  KeyE: 'interact',
  Enter: 'interact',
}

export type KeyboardInput = {
  state: InputState
  clear(): void
  dispose(): void
  /** Whether E/Enter was pressed since the last call: a tap shorter than a frame still counts once. */
  takeInteract(): boolean
}

/** Held-key state for movement. Clears itself whenever focus leaves, so keys never stick. */
export function createKeyboardInput(target: Window): KeyboardInput {
  const state: InputState = { up: false, down: false, left: false, right: false, interact: false }
  let pressed = false
  const clear = () => {
    for (const k of Object.keys(state) as (keyof InputState)[]) state[k] = false
    pressed = false
  }
  const set = (e: KeyboardEvent, down: boolean) => {
    const key = KEYMAP[e.code]
    if (!key) return
    if (down && (isTypingTarget(e.target) || e.altKey || e.ctrlKey || e.metaKey)) return
    // Enter/E on a focused control belongs to that control, not to the world.
    if (down && key === 'interact' && e.target instanceof Element && e.target.closest('button, a, [role="button"]')) return
    if (down && key === 'interact' && !e.repeat) pressed = true
    state[key] = down
  }
  const onDown = (e: KeyboardEvent) => set(e, true)
  const onUp = (e: KeyboardEvent) => set(e, false)
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') clear()
  }
  target.addEventListener('keydown', onDown)
  target.addEventListener('keyup', onUp)
  target.addEventListener('blur', clear)
  document.addEventListener('visibilitychange', onVisibility)
  return {
    state,
    clear,
    takeInteract() {
      const p = pressed
      pressed = false
      return p
    },
    dispose() {
      target.removeEventListener('keydown', onDown)
      target.removeEventListener('keyup', onUp)
      target.removeEventListener('blur', clear)
      document.removeEventListener('visibilitychange', onVisibility)
    },
  }
}
