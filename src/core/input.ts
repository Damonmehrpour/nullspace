/** True when a key event comes from a place where the visitor is typing text. */
export function isTypingTarget(t: EventTarget | null): boolean {
  if (!(t instanceof Element)) return false
  if (t.closest('input, textarea, select')) return true
  const editable = t.closest('[contenteditable]')
  return editable !== null && editable.getAttribute('contenteditable') !== 'false'
}
