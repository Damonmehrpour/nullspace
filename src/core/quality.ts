// Adaptive quality. The visitor's choice (or, on Auto, the level detected for this device) is the
// ceiling; frame-rate declines step down from it (pixel ratio, then Medium, then Low) and inclines step
// back up, never above the ceiling. Levels differ only in pixel ratio and hidden detail, never in which
// shaders exist, so changing level never compiles anything.

export type QualityLevel = 'high' | 'medium' | 'low'
export type QualityChoice = 'auto' | QualityLevel
/** recoveries counts climbs back from Low; after three, the next drop to Low is permanent (no flip-flopping). */
export type QualityState = { chosen: QualityChoice; ceiling: QualityLevel; effective: QualityLevel; reducedDpr: boolean; recoveries: number; locked: boolean }

const MAX_RECOVERIES = 3
const ORDER: QualityLevel[] = ['low', 'medium', 'high']

/** dpr is the most pixels per CSS pixel to render (capped by the screen's own ratio by the canvas). */
export type RenderBudget = { dpr: number; detail: QualityLevel; playerLight: boolean; spores: number; dust: number }

export function createQuality(chosen: QualityChoice, detected: QualityLevel = 'high'): QualityState {
  const ceiling = chosen === 'auto' ? detected : chosen
  return { chosen, ceiling, effective: ceiling, reducedDpr: ceiling !== 'high', recoveries: 0, locked: false }
}

export function onDecline(q: QualityState): QualityState {
  if (q.locked) return q
  if (q.effective === 'high' && !q.reducedDpr) return { ...q, reducedDpr: true }
  if (q.effective === 'low') return q
  const effective = ORDER[ORDER.indexOf(q.effective) - 1]
  return { ...q, effective, reducedDpr: true, locked: effective === 'low' && q.recoveries >= MAX_RECOVERIES }
}

export function onIncline(q: QualityState): QualityState {
  if (q.locked) return q
  if (ORDER.indexOf(q.effective) < ORDER.indexOf(q.ceiling)) {
    const effective = ORDER[ORDER.indexOf(q.effective) + 1]
    return { ...q, effective, recoveries: q.effective === 'low' ? q.recoveries + 1 : q.recoveries }
  }
  if (q.effective === 'high' && q.reducedDpr) return { ...q, reducedDpr: false }
  return q
}

export function renderBudget(q: QualityState): RenderBudget {
  if (q.effective === 'low') return { dpr: 1, detail: 'low', playerLight: false, spores: 24, dust: 140 }
  if (q.effective === 'medium') return { dpr: 1, detail: 'medium', playerLight: true, spores: 40, dust: 220 }
  return { dpr: q.reducedDpr ? 1 : 1.5, detail: 'high', playerLight: true, spores: 60, dust: 420 }
}

export type DeviceHints = { renderer: string; cores?: number; memory?: number; touch: boolean }

/**
 * A conservative starting level for this device. Software rendering and small touch devices start Low;
 * integrated or mobile GPUs, few cores or little memory start Medium; otherwise High. Unknown values
 * are treated as unknown, not as weak.
 */
export function detectQualityTier(d: DeviceHints): QualityLevel {
  const r = d.renderer.toLowerCase()
  if (/swiftshader|llvmpipe|software|basic render/.test(r)) return 'low'
  const fewCores = d.cores !== undefined && d.cores <= 4
  const lowMemory = d.memory !== undefined && d.memory <= 4
  if (d.touch) return (d.memory !== undefined && d.memory <= 3) || fewCores ? 'low' : 'medium'
  if (/intel|mali|adreno|powervr|apple gpu|videocore|radeon\(tm\) graphics/.test(r)) return 'medium'
  if (fewCores || lowMemory) return 'medium'
  return 'high'
}
