import { useState } from 'react'
import type { Media } from '../../content/schema'

function youTubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{6,})/)
  return m ? m[1] : null
}

function Unavailable({ media, why }: { media: Media; why: string }) {
  return (
    <figure className="media-frame flex aspect-video flex-col items-center justify-center gap-1 border-2 border-dashed border-ash p-4 text-center">
      <span className="font-semibold">{why}</span>
      <figcaption className="text-sm text-graphite">{media.alt}</figcaption>
    </figure>
  )
}

export function MediaItem({ media }: { media: Media }) {
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)

  if (media.src.state === 'pending') {
    const fallback = media.kind === 'image' ? 'image coming soon' : 'video coming soon'
    return <Unavailable media={media} why={media.src.note ?? fallback} />
  }
  if (failed) return <Unavailable media={media} why="media unavailable" />

  const src = media.src.value
  if (media.kind === 'youtube') {
    const id = youTubeId(src)
    if (!id) return <Unavailable media={media} why="media unavailable" />
    return (
      <figure className="media-frame">
        {playing ? (
          <iframe
            className="aspect-video w-full"
            src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1`}
            title={media.alt}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button type="button" onClick={() => setPlaying(true)} className="flex aspect-video w-full items-center justify-center bg-void text-concrete">
            <span className="border-2 border-concrete px-4 py-2 font-semibold">Play video</span>
            <span className="sr-only">: {media.alt}</span>
          </button>
        )}
        {media.caption && <figcaption className="mt-1 text-sm text-graphite">{media.caption}</figcaption>}
      </figure>
    )
  }
  return (
    <figure className="media-frame">
      {media.kind === 'image' ? (
        <img src={src} alt={media.alt} loading="lazy" onError={() => setFailed(true)} className="w-full" />
      ) : (
        <video src={src} controls preload="none" aria-label={media.alt} onError={() => setFailed(true)} className="w-full" />
      )}
      {media.caption && <figcaption className="mt-1 text-sm text-graphite">{media.caption}</figcaption>}
    </figure>
  )
}
