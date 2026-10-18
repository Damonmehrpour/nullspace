// Adaptive quality. The visitor's setting is the ceiling; frame-rate declines step down from it
// (pixel ratio first, then Low) and inclines step back up — never above the visitor's choice.

export type QualityLevel = 'high' | 'low'
export type QualityState = { chosen: QualityLevel; effective: QualityLevel; reducedDpr: boolean }
export type RenderBudget = { dpr: number; playerLight: boolean; spores: number }

export function createQuality(chosen: QualityLevel): QualityState {
  return { chosen, effective: chosen, reducedDpr: chosen === 'low' }
}

export function onDecline(q: QualityState): QualityState {
  if (!q.reducedDpr) return { ...q, reducedDpr: true }
  return { ...q, effective: 'low' }
}

export function onIncline(q: QualityState): QualityState {
  if (q.chosen === 'low') return q
  if (q.effective === 'low') return { ...q, effective: 'high' }
  return { ...q, reducedDpr: false }
}

export function renderBudget(q: QualityState): RenderBudget {
  if (q.effective === 'low') return { dpr: 1, playerLight: false, spores: 24 }
  return { dpr: q.reducedDpr ? 1 : 1.5, playerLight: true, spores: 60 }
}
