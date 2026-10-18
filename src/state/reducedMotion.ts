import type { Settings } from './settings'

/** The setting wins; 'system' follows the OS preference. */
export function isReducedMotion(settings: Pick<Settings, 'reducedMotion'>): boolean {
  if (settings.reducedMotion !== 'system') return settings.reducedMotion === 'on'
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}
