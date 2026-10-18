// Remembers which elements opened dialogs so focus can go back on close. A stack, because a dialog
// can be replaced by a nested one (Projects → a project): the original opener must survive that.
const openers: HTMLElement[] = []

export function rememberOpener(el: HTMLElement | null): void {
  if (el) openers.push(el)
}

/**
 * Called when a dialog closes. Deferred one microtask: if another dialog has taken over (a panel was
 * replaced), the stack is kept for that dialog's close. Otherwise focus returns to the most recent
 * opener still in the document, then `fallback`, then nothing.
 */
export function restoreFocus(fallback?: HTMLElement | null): void {
  queueMicrotask(() => {
    if (document.querySelector('[role="dialog"]')) return
    while (openers.length > 0) {
      const el = openers.pop()!
      if (el.isConnected && !el.closest('[inert]')) {
        el.focus()
        return
      }
    }
    if (fallback && fallback.isConnected) fallback.focus()
    else (document.activeElement as HTMLElement | null)?.blur?.()
  })
}
