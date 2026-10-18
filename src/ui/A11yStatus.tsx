import { cv } from '../content/cv'
import { SECTION_IDS } from '../content/schema'
import { WORLD } from '../content/world'
import { isTourComplete } from '../core/tour'
import { useStore } from '../state/store'

/** Navigation facts for assistive tech. Independent of subtitles, which only carry flavour. */
export function A11yStatus() {
  const target = useStore((s) => s.tourTarget)
  const done = useStore((s) => isTourComplete(WORLD.tourOrder, s.worldVisited))
  const message = done
    ? 'All destinations reached.'
    : target
      ? `Next destination: ${cv[target].title}. Follow the guide or press ${SECTION_IDS.indexOf(target) + 1} to open.`
      : ''
  return (
    <div aria-live="polite" data-testid="a11y-status" className="sr-only">
      {message}
    </div>
  )
}
