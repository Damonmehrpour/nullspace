import { useStore } from '../state/store'

export type FailureReason = 'load' | 'crash' | 'context'

const COPY: Record<FailureReason, { title: string; body: string }> = {
  load: { title: "The simulation didn't load.", body: 'The 3D files could not be downloaded. Check your connection and retry, or read the portfolio instead.' },
  crash: { title: 'The simulation collapsed. Typical.', body: 'Something broke inside the 3D world. Retry, or read the portfolio instead.' },
  context: { title: 'The graphics context was lost.', body: 'Your browser stopped rendering the 3D world. Retry, or read the portfolio instead.' },
}

type Props = { reason: FailureReason; onRetry: () => void; onReloadRetry?: () => void }

export function ErrorFallback({ reason, onRetry, onReloadRetry }: Props) {
  const setPhase = useStore((s) => s.setPhase)
  const copy = COPY[reason]
  return (
    <section role="alert" className="fixed inset-0 z-10 flex flex-col justify-center gap-6 bg-void px-6 md:px-16">
      <h2 className="display m-0 text-4xl md:text-6xl">{copy.title}</h2>
      <p className="m-0 max-w-xl text-lg text-ash">{copy.body}</p>
      <div className="flex flex-wrap gap-4">
        {onReloadRetry ? (
          <button type="button" onClick={onReloadRetry} className="border-4 border-concrete bg-concrete px-5 py-3 font-bold text-void">
            Reload and retry
          </button>
        ) : (
          <button type="button" onClick={onRetry} className="border-4 border-concrete bg-concrete px-5 py-3 font-bold text-void">
            Retry
          </button>
        )}
        <button type="button" onClick={() => setPhase('portfolio')} className="border-4 border-concrete px-5 py-3 font-bold">
          View Portfolio
        </button>
      </div>
    </section>
  )
}
