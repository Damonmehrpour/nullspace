import type { SectionId } from '../content/schema'
import { DIALOGUE } from './config'

export type DialogueEventKey =
  | 'firstMeet'
  | 'greet'
  | 'wait'
  | 'boundary'
  | 'idle'
  | 'tourComplete'
  | 'skipTour'
  | `arrive:${SectionId}`
  | `revisit:${SectionId}`

export type DialogueRule = { lines: string[]; cooldownMs: number; probability: number; once?: boolean }
export type DialogueTable = Partial<Record<DialogueEventKey, DialogueRule>>

/**
 * Turns gameplay events into occasional lines. Silence is the default: per-event cooldowns, a global
 * gap between any two lines, optional probability and once-only events. Blocked lines are dropped,
 * never queued.
 */
export function createDialogueDirector(table: DialogueTable, rng: () => number, globalGapMs: number = DIALOGUE.globalGapMs) {
  let lastLineAt: number | null = null
  const lastByEvent = new Map<DialogueEventKey, number>()
  const lastLine = new Map<DialogueEventKey, string>()
  const fired = new Set<DialogueEventKey>()

  return {
    emit(event: DialogueEventKey, nowMs: number): string | null {
      const rule = table[event]
      if (!rule || rule.lines.length === 0) return null
      if (rule.once && fired.has(event)) return null
      const last = lastByEvent.get(event)
      if (last !== undefined && nowMs - last < rule.cooldownMs) return null
      if (lastLineAt !== null && nowMs - lastLineAt < globalGapMs) return null
      if (rng() >= rule.probability) return null

      let pool = rule.lines
      const prev = lastLine.get(event)
      if (pool.length > 1 && prev !== undefined) pool = pool.filter((l) => l !== prev)
      const line = pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))]

      lastLineAt = nowMs
      lastByEvent.set(event, nowMs)
      lastLine.set(event, line)
      fired.add(event)
      return line
    },
  }
}
