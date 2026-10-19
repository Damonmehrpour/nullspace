/**
 * A short scripted exchange: lines said in order, each after the previous one has been shown and
 * cleared, with a pause between them. Unlike ordinary dialogue it is never dropped: it waits while
 * something else is on screen (another line, or an open panel). Triggering it again after it has
 * started does nothing, so it plays once per visit.
 */
export function createStoryMoment(lines: string[], pauseMs: number) {
  type State = { kind: 'idle' } | { kind: 'pending' } | { kind: 'speaking'; index: number; seen: boolean } | { kind: 'pausing'; index: number; since: number } | { kind: 'done' }
  let state: State = { kind: 'idle' }

  return {
    trigger(): void {
      if (state.kind === 'idle') state = { kind: 'pending' }
    },
    /** True from the trigger until the last line has been shown and cleared. */
    active(): boolean {
      return state.kind === 'pending' || state.kind === 'speaking' || state.kind === 'pausing'
    },
    /** Advance with the time and whether something is showing; returns a line to say now, if any. */
    tick(nowMs: number, busy: boolean): string | null {
      if (state.kind === 'pending') {
        if (busy) return null
        state = { kind: 'speaking', index: 0, seen: false }
        return lines[0]
      }
      if (state.kind === 'speaking') {
        if (busy) {
          state = { ...state, seen: true }
          return null
        }
        if (!state.seen) return null
        state = state.index + 1 < lines.length ? { kind: 'pausing', index: state.index, since: nowMs } : { kind: 'done' }
        return null
      }
      if (state.kind === 'pausing') {
        if (busy || nowMs - state.since < pauseMs) return null
        const index = state.index + 1
        state = { kind: 'speaking', index, seen: false }
        return lines[index]
      }
      return null
    },
  }
}
