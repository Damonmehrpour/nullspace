import { useEffect } from 'react'
import { useStore } from '../state/store'
import { guideCue } from '../world/v2/cues'
import { applySoundSettings, chime, chirp, tick } from './soundscape'

/** Connects the visitor's sound settings and a few world events to the (optional) soundscape. */
export function AudioBridge() {
  useEffect(() => {
    applySoundSettings(useStore.getState().settings)
    const unsub = useStore.subscribe((s, prev) => {
      if (s.settings.sound !== prev.settings.sound || s.settings.volume !== prev.settings.volume) applySoundSettings(s.settings)
      if (s.subtitle && s.subtitle.id !== prev.subtitle?.id) chirp()
      if (s.panel && !prev.panel) tick()
    })
    let lastCue = guideCue.seq
    const timer = window.setInterval(() => {
      if (guideCue.seq !== lastCue) {
        lastCue = guideCue.seq
        chime()
      }
    }, 200)
    return () => {
      unsub()
      window.clearInterval(timer)
    }
  }, [])
  return null
}
