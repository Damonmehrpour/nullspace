import { cv } from '../content/cv'
import { SECTION_IDS, type SectionId } from '../content/schema'
import { useStore } from '../state/store'
import { rememberOpener } from './focusReturn'
import { StatusBadge } from './StatusBadge'

type Props = {
  world: boolean
  onGuideMeThere?: (id: SectionId) => void
  onDone: () => void
}

export function QuickNav({ world, onGuideMeThere, onDone }: Props) {
  const viewed = useStore((s) => s.viewed)
  const worldVisited = useStore((s) => s.worldVisited)
  const tourTarget = useStore((s) => s.tourTarget)
  const openSection = useStore((s) => s.openSection)

  return (
    <div id="quicknav" className="absolute top-full right-0 z-30 mt-2 w-[min(26rem,calc(100vw-2rem))] border-4 border-concrete bg-void p-4 text-concrete">
      {world && (
        <p className="mt-0 mb-3 flex justify-between gap-4">
          <span>{tourTarget ? `Next: ${cv[tourTarget].title}` : 'Tour complete'}</span>
          <span>{`reached ${worldVisited.size}/${SECTION_IDS.length}`}</span>
        </p>
      )}
      <ul className="m-0 list-none space-y-2 p-0">
        {SECTION_IDS.map((id, i) => (
          <li key={id} aria-label={cv[id].title} className="border-t-2 border-graphite pt-2 first:border-t-0 first:pt-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold">
                {i + 1}. {cv[id].title}
              </span>
              <StatusBadge status={cv[id].status} />
              {viewed.has(id) && <span className="text-sm text-ash">read</span>}
              {world && worldVisited.has(id) && <span className="text-sm text-moss">reached</span>}
            </div>
            <div className="mt-1 flex gap-3">
              <button
                type="button"
                className="underline underline-offset-4"
                onClick={(e) => {
                  rememberOpener(document.getElementById('quicknav-toggle') ?? e.currentTarget)
                  onDone()
                  openSection(id, { source: 'quicknav' })
                }}
              >
                Open
              </button>
              {world && onGuideMeThere && (
                <button
                  type="button"
                  className="underline underline-offset-4"
                  onClick={() => {
                    onDone()
                    onGuideMeThere(id)
                  }}
                >
                  Guide me there
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
