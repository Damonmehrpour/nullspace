import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { createPortal } from 'react-dom'
import type { Media } from '../../content/schema'

const src = (m: Media) => (m.src.state === 'confirmed' ? m.src.value : '')
const aspect = (m: Media) => (m.size ? `${m.size.w} / ${m.size.h}` : '9 / 19.5')

/**
 * A project's screenshots: the featured one large (portrait phone shots are shown whole, never
 * cropped), a strip of thumbnails to switch it, and a full-screen viewer to inspect any of them,
 * browsable with arrows, swipes or the keyboard.
 */
export function Gallery({ images, name }: { images: Media[]; name: string }) {
  const [current, setCurrent] = useState(0)
  const [viewing, setViewing] = useState<number | null>(null)
  const opener = useRef<HTMLButtonElement>(null)
  if (images.length === 0) return null
  const m = images[current]
  return (
    <section aria-label={`${name} screenshots`} className="gallery mt-6">
      <figure className="m-0">
        <button
          ref={opener}
          type="button"
          onClick={() => setViewing(current)}
          className="gallery-feature group relative mx-auto block cursor-zoom-in border-2 border-current p-0"
          style={{ aspectRatio: aspect(m) }}
          aria-label={`Open screenshot ${current + 1} of ${images.length} larger: ${m.caption ?? m.alt}`}
        >
          <img src={src(m)} alt={m.alt} width={m.size?.w} height={m.size?.h} decoding="async" className="block h-full w-full object-contain" />
          <span aria-hidden className="absolute right-2 bottom-2 bg-void/80 px-2 py-0.5 text-xs font-semibold text-concrete opacity-80 group-hover:opacity-100">
            Enlarge
          </span>
        </button>
        <figcaption className="mt-2 flex items-baseline justify-between gap-3 text-sm">
          <span className="font-semibold">{m.caption}</span>
          <span className="opacity-70">
            {current + 1} / {images.length}
          </span>
        </figcaption>
      </figure>
      {images.length > 1 && (
        <ul aria-label="Choose a screenshot" className="gallery-strip mt-3 flex list-none gap-2 overflow-x-auto p-0 pb-2">
          {images.map((s, i) => (
            <li key={src(s)} className="shrink-0">
              <button
                type="button"
                aria-pressed={i === current}
                aria-label={`Show screenshot ${i + 1}: ${s.caption ?? s.alt}`}
                onClick={() => setCurrent(i)}
                className={`block w-16 border-2 p-0 ${i === current ? 'border-moss' : 'border-transparent opacity-70 hover:opacity-100'}`}
                style={{ aspectRatio: aspect(s) }}
              >
                <img src={s.thumb ?? src(s)} alt="" loading="lazy" decoding="async" className="block h-full w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {viewing !== null && (
        <Viewer
          images={images}
          index={viewing}
          onIndex={(i) => {
            setViewing(i)
            setCurrent(i)
          }}
          onClose={() => {
            setViewing(null)
            queueMicrotask(() => opener.current?.focus())
          }}
        />
      )}
    </section>
  )
}

/** The full-screen screenshot viewer (a modal dialog over the detail view). */
function Viewer({ images, index, onIndex, onClose }: { images: Media[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const swipe = useRef<{ x: number; y: number } | null>(null)
  const m = images[index]
  const go = (d: number) => onIndex((index + d + images.length) % images.length)

  useEffect(() => {
    closeRef.current?.focus()
  }, [])

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    // Keys here belong to the viewer: none reach the detail view or the global shortcuts behind it.
    e.stopPropagation()
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    } else if (e.key === 'ArrowRight') go(1)
    else if (e.key === 'ArrowLeft') go(-1)
    else if (e.key === 'Tab' && ref.current) {
      const items = Array.from(ref.current.querySelectorAll<HTMLElement>('button'))
      const i = items.indexOf(document.activeElement as HTMLElement)
      e.preventDefault()
      items[(i + (e.shiftKey ? -1 : 1) + items.length) % items.length]?.focus()
    }
  }
  const down = (e: PointerEvent) => (swipe.current = { x: e.clientX, y: e.clientY })
  const up = (e: PointerEvent) => {
    const s = swipe.current
    swipe.current = null
    if (!s) return
    const dx = e.clientX - s.x
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - s.y)) go(dx < 0 ? 1 : -1)
  }

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={`Screenshot ${index + 1} of ${images.length}`}
      data-testid="gallery-viewer"
      className="gallery-viewer fixed inset-0 z-50 flex flex-col bg-void text-concrete"
      onKeyDown={onKeyDown}
    >
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <span className="text-sm font-semibold">
          {index + 1} / {images.length}
          {m.caption ? ` · ${m.caption}` : ''}
        </span>
        <button ref={closeRef} type="button" onClick={onClose} className="border-2 border-concrete px-3 py-1 font-semibold hover:bg-concrete hover:text-void">
          Close
        </button>
      </div>
      <div className="relative min-h-0 flex-1 touch-pan-y" onPointerDown={down} onPointerUp={up} onClick={(e) => e.target === e.currentTarget && onClose()}>
        <img src={src(m)} alt={m.alt} className="pointer-events-none absolute inset-0 m-auto max-h-full max-w-full object-contain" />
      </div>
      <p className="mx-auto mt-2 max-w-[60ch] px-4 text-center text-sm opacity-80">{m.alt}</p>
      {images.length > 1 && (
        <div className="flex items-center justify-center gap-3 px-4 pt-3 pb-5">
          <button type="button" onClick={() => go(-1)} className="min-h-11 border-2 border-concrete px-4 font-semibold hover:bg-concrete hover:text-void">
            ← Previous
          </button>
          <button type="button" onClick={() => go(1)} className="min-h-11 border-2 border-concrete px-4 font-semibold hover:bg-concrete hover:text-void">
            Next →
          </button>
        </div>
      )}
    </div>,
    document.body,
  )
}
