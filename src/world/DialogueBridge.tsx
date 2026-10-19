import { useEffect } from 'react'
import { cv } from '../content/cv'
import { dialogue, storyMoments } from '../content/dialogue'
import { WORLD } from '../content/world'
import { createDialogueDirector, type DialogueEventKey } from '../core/dialogueDirector'
import { pulseSpeak } from '../core/guideBrain'
import { createStoryMoment } from '../core/storyMoment'
import { isTourComplete } from '../core/tour'
import { useStore } from '../state/store'
import { sim, type SimEvent } from './sim'
import { guideLook } from './v2/cues'

const STORY_TICK_MS = 200

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
    // Story moments, one per project that has one, played once per visit near its artifact.
    const stories = cv.projects.projects.map((p) => (storyMoments[p.id] ? createStoryMoment(storyMoments[p.id].lines, storyMoments[p.id].pauseMs) : null))
    const storyActive = () => stories.some((m) => m?.active())
    const speak = (key: DialogueEventKey) => {
      if (storyActive()) return // ordinary chatter never talks over a story
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

    // Coming within an artifact's range starts its story. It waits while a line or a panel is showing,
    // so it never covers the project information, and goes through the same subtitle/live region.
    const unsubNear = useStore.subscribe((s, prev) => {
      if (s.phase === 'world' && s.nearArtifact !== null && s.nearArtifact !== prev.nearArtifact) stories[s.nearArtifact]?.trigger()
    })
    const timer = window.setInterval(() => {
      const s = useStore.getState()
      if (s.phase !== 'world') return
      const now = performance.now()
      stories.forEach((m, i) => {
        const line = m?.tick(now, s.subtitle !== null || s.panel !== null)
        if (!line) return
        s.say(line)
        sim.guide = pulseSpeak(sim.guide)
        const slot = WORLD.islands.find((isl) => isl.id === 'projects')!.artifactSlots[i]
        Object.assign(guideLook, { x: slot.x, z: slot.z, untilMs: now + 7000 })
      })
    }, STORY_TICK_MS)

    return () => {
      sim.listeners.delete(onSim)
      unsub()
      unsubNear()
      window.clearInterval(timer)
    }
  }, [])
  return null
}
