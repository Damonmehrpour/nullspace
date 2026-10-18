import { useStore } from '../state/store'

export function Loading3D() {
  const setPhase = useStore((s) => s.setPhase)
  return (
    <section aria-live="polite" className="fixed inset-0 z-10 flex flex-col justify-end gap-4 bg-void p-6 md:p-12">
      <p className="m-0 font-mono text-ash">&gt; materializing void...</p>
      <button type="button" onClick={() => setPhase('portfolio')} className="self-start underline underline-offset-4">
        View Portfolio instead
      </button>
    </section>
  )
}
