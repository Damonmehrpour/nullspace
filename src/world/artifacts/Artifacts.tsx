import { cv } from '../../content/cv'
import type { IslandDef } from '../../content/world'
import { ArtifactShell } from './ArtifactShell'
import { Experimental } from './Experimental'
import { Featured } from './Featured'
import { Technical } from './Technical'

/** The three project artifacts, placed at the Projects island's slots and chosen by `appearance`. */
export function Artifacts({ island }: { island: IslandDef }) {
  return (
    <>
      {cv.projects.projects.map((p, i) => {
        const slot = island.artifactSlots[i]
        return (
          <ArtifactShell key={p.id} project={p} slot={slot}>
            {p.appearance === 'featured' ? <Featured /> : p.appearance === 'technical' ? <Technical slot={slot} /> : <Experimental />}
          </ArtifactShell>
        )
      })}
    </>
  )
}
