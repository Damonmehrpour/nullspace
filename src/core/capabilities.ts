// Two simple hints for the entry screen. No device fingerprinting.

export function hasWebGL2(): boolean {
  try {
    return document.createElement('canvas').getContext('webgl2') !== null
  } catch {
    return false
  }
}

export function isTouchFirst(): boolean {
  try {
    if (window.matchMedia('(pointer: coarse) and (hover: none)').matches) return true
  } catch {
    // no matchMedia: fall through to width
  }
  return window.innerWidth < 768
}

/** Indirection so components and tests share one swappable reference. */
export const capabilities = { hasWebGL2, isTouchFirst }
