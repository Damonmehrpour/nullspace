import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { SectionId } from '../../content/schema'
import { useStore } from '../../state/store'

/** Reveal progress for an island: 0 before its first visit, 0→1 while revealing, 1 once played. */
export function useReveal(id: SectionId) {
  const progress = useRef(0)
  useFrame(() => {
    const s = useStore.getState()
    progress.current = s.revealing === id ? s.revealProgress() : s.revealPlayed.has(id) ? 1 : 0
  })
  return progress
}

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3)
