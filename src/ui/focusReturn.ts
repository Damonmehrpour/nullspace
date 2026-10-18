// Remembers which element opened a dialog so focus can go back to it on close.
let opener: HTMLElement | null = null

export function rememberOpener(el: HTMLElement | null): void {
  opener = el
}

export function restoreFocus(fallback?: HTMLElement | null): void {
  const target = opener && opener.isConnected ? opener : fallback && fallback.isConnected ? fallback : null
  opener = null
  if (target) target.focus()
  else (document.activeElement as HTMLElement | null)?.blur?.()
}
