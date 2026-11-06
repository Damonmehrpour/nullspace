import { useEffect, useRef } from 'react'
import { cv } from '../content/cv'
import { AREA_LABEL, SECTION_IDS, type SectionId } from '../content/schema'
import { WORLD_AVAILABLE } from '../core/config'
import { useStore } from '../state/store'
import { SectionView } from '../ui/Panel/PanelHost'
import { StatusBadge } from '../ui/StatusBadge'
import { AtAGlance } from './AtAGlance'

/** Marks a section viewed once it scrolls into view. Viewing never counts as a world visit. */
function useViewedOnScroll(id: SectionId) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          const s = useStore.getState()
          if (!s.viewed.has(id)) useStore.setState({ viewed: new Set(s.viewed).add(id) })
          io.disconnect()
        }
      },
      // Height-independent: a section counts as read once it reaches the upper 60% of the viewport.
      { threshold: 0, rootMargin: '0px 0px -40% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [id])
  return ref
}

function PortfolioSection({ id }: { id: SectionId }) {
  const ref = useViewedOnScroll(id)
  const section = cv[id]
  const headingId = `portfolio-${id}`
  return (
    // Stacked below 1024 px; beside the content from there, in a title column sized for the longest
    // title word ("Experience" sets at ≈ 6.9 × the font size in the expanded display cut).
    <section ref={ref} aria-labelledby={headingId} className="slab border-t-4 border-concrete py-14 lg:grid lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-12 lg:py-20 xl:grid-cols-[20rem_minmax(0,1fr)] xl:gap-16">
      <header className="mb-8 lg:mb-0">
        <h2 id={headingId} className="section-title display m-0 scroll-mt-28">
          {section.title}
        </h2>
        <div className="mt-3">
          <StatusBadge status={section.status} />
        </div>
      </header>
      <div className="cv-body max-w-[68ch] min-w-0">
        <SectionView id={id} source="portfolio" />
      </div>
    </section>
  )
}

export function Portfolio() {
  return (
    <main className="mx-auto max-w-6xl px-4 pt-28 pb-24 md:px-8">
      <div className="hero relative mb-16 overflow-hidden">
        <div aria-hidden className="void-lines" />
        <h1 className="display relative m-0 text-[clamp(2.5rem,10vw,8.75rem)]">NULLSPACE</h1>
        <p className="relative mt-4 mb-0 text-2xl font-semibold">{cv.profile.name}</p>
        <p className="relative mt-1 mb-0 max-w-2xl text-xl">{cv.profile.headline}</p>
        <p className="relative mt-2 mb-0 text-ash">{cv.profile.areas.map((a) => AREA_LABEL[a]).join(' · ')}</p>
        <AtAGlance cv={cv} />
        {WORLD_AVAILABLE && (
          <button
            type="button"
            className="relative mt-6 border-2 border-concrete px-5 py-2 font-semibold hover:bg-concrete hover:text-void"
            onClick={() => {
              useStore.getState().setModePreference('world')
              useStore.getState().setPhase('loading3d')
            }}
          >
            Enter the 3D world
          </button>
        )}
      </div>
      {SECTION_IDS.map((id) => (
        <PortfolioSection key={id} id={id} />
      ))}
    </main>
  )
}
