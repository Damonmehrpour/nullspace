import { useEffect, useRef } from 'react'
import { cv } from '../content/cv'
import { AREA_LABEL, SECTION_IDS, type SectionId } from '../content/schema'
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
    <section ref={ref} aria-labelledby={headingId} className="slab border-t-4 border-concrete py-12 md:grid md:grid-cols-[minmax(12rem,1fr)_3fr] md:gap-12">
      <header className="mb-6 md:mb-0">
        <h2 id={headingId} className="display m-0 scroll-mt-24 text-4xl md:text-5xl">
          {section.title}
        </h2>
        <div className="mt-3">
          <StatusBadge status={section.status} />
        </div>
      </header>
      <div className="max-w-[65ch]">
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
        <h1 className="display relative m-0 text-[clamp(2.75rem,11.5vw,10rem)]">NULLSPACE</h1>
        <p className="relative mt-4 mb-0 text-2xl font-semibold">{cv.profile.name}</p>
        <p className="relative mt-1 mb-0 max-w-2xl text-xl">{cv.profile.headline}</p>
        <p className="relative mt-2 mb-0 text-ash">{cv.profile.areas.map((a) => AREA_LABEL[a]).join(' · ')}</p>
        <AtAGlance cv={cv} />
      </div>
      {SECTION_IDS.map((id) => (
        <PortfolioSection key={id} id={id} />
      ))}
    </main>
  )
}
