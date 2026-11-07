import { cv } from '../../content/cv'
import type { IslandDef } from '../../content/world'
import { ArtifactShell } from './ArtifactShell'
import { Experimental } from './Experimental'
import { Featured } from './Featured'
import { Technical } from './Technical'
import { WordGame } from './WordGame'
import { v } from '../../core/geometry'

/** The project artifacts at the Projects island's slots, chosen by `appearance`; the word game stands on the floor. */
export function Artifacts({ island }: { island: IslandDef }) {
  return (
    <>
      {cv.projects.projects.map((p, i) => {
        const slot = island.artifactSlots[i]
        if (p.appearance === 'wordgame')
          return (
            <ArtifactShell key={p.id} project={p} slot={slot} grounded facing={v.angleOf(v.sub(island.centre, slot))}>
              <WordGame />
            </ArtifactShell>
          )
        return (
          <ArtifactShell key={p.id} project={p} slot={slot}>
            {p.appearance === 'featured' ? <Featured /> : p.appearance === 'technical' ? <Technical slot={slot} /> : <Experimental />}
          </ArtifactShell>
        )
      })}
    </>
  )
}
