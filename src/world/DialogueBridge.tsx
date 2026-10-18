import { useEffect } from 'react'
import { dialogue } from '../content/dialogue'
import { WORLD } from '../content/world'
import { createDialogueDirector, type DialogueEventKey } from '../core/dialogueDirector'
import { pulseSpeak } from '../core/guideBrain'
import { isTourComplete } from '../core/tour'
import { useStore } from '../state/store'
import { sim, type SimEvent } from './sim'

const SIM_EVENTS: Partial<Record<SimEvent, DialogueEventKey>> = {
  firstMeet: 'firstMeet',
  greet: 'greet',
  wait: 'wait',
  boundary: 'boundary',
  idle: 'idle',
}

/** Turns gameplay events into occasional kokedama lines, each with a speaking pulse. */
export function DialogueBridge() {
  useEffect(() => {
    const director = createDialogueDirector(dialogue, Math.random)
    const speak = (key: DialogueEventKey) => {
      const line = director.emit(key, performance.now())
      if (!line) return
      useStore.getState().say(line)
      sim.guide = pulseSpeak(sim.guide)
    }

    const onSim = (events: SimEvent[], entered: string | null) => {
      if (entered) {
        const id = entered as (typeof WORLD.tourOrder)[number]
        // arrive() already ran this step; a reveal now running means this was a first visit.
        speak(useStore.getState().revealing === id ? `arrive:${id}` : `revisit:${id}`)
      }
      for (const e of events) {
        const key = SIM_EVENTS[e]
        if (key) speak(key)
      }
    }
    sim.listeners.add(onSim)

    const unsub = useStore.subscribe((s, prev) => {
      if (s.phase !== 'world') return
      if (s.panel && !prev.panel && s.lastOpenSource === 'quicknav' && !isTourComplete(WORLD.tourOrder, s.worldVisited)) speak('skipTour')
      if (!s.panel && prev.panel && isTourComplete(WORLD.tourOrder, s.worldVisited)) speak('tourComplete')
    })

    return () => {
      sim.listeners.delete(onSim)
      unsub()
    }
  }, [])
  return null
}
