import type { QualityChoice } from '../core/quality'
import { readJSON, writeJSON } from '../core/safeStorage'

export type Settings = {
  typing: boolean
  reducedMotion: 'system' | 'on' | 'off'
  subtitles: boolean
  /** Auto picks a level for this device; an explicit level is the ceiling. */
  quality: QualityChoice
  /** How fast dragging turns the camera. */
  lookSensitivity: 'low' | 'normal' | 'high'
  /** Drag up to look down instead (and I/K swapped). */
  invertLook: boolean
}

export type ModePreference = 'world' | 'portfolio'

export const STORAGE_KEYS = {
  settings: 'nullspace.settings',
  mode: 'nullspace.mode',
  booted: 'nullspace.booted',
} as const

export const DEFAULT_SETTINGS: Settings = { typing: true, reducedMotion: 'system', subtitles: true, quality: 'auto', lookSensitivity: 'normal', invertLook: false }

export function loadSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...readJSON<Partial<Settings>>(STORAGE_KEYS.settings, {}) }
}

export function saveSettings(s: Settings): void {
  writeJSON(STORAGE_KEYS.settings, s)
}

export function loadModePreference(): ModePreference | null {
  const m = readJSON<unknown>(STORAGE_KEYS.mode, null)
  return m === 'world' || m === 'portfolio' ? m : null
}

export function saveModePreference(m: ModePreference): void {
  writeJSON(STORAGE_KEYS.mode, m)
}
