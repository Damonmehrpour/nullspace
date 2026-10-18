import { useId, useMemo, useState } from 'react'
import { capabilities } from '../core/capabilities'
import { WORLD_AVAILABLE } from '../core/config'
import { useStore } from '../state/store'

export const TOUCH_NOTE = '3D walking needs a keyboard in this version. View Portfolio has everything.'
const NO_WEBGL_NOTE = "Your browser can't render the simulation."

const primary = 'display border-4 border-concrete bg-concrete px-6 py-4 text-2xl text-void md:text-3xl'
const secondary = 'display border-4 border-concrete px-6 py-4 text-2xl text-concrete md:text-3xl disabled:cursor-not-allowed disabled:opacity-40'

export function Entry() {
  const noteId = useId()
  const setPhase = useStore((s) => s.setPhase)
  const setModePreference = useStore((s) => s.setModePreference)
  const remembered = useStore((s) => s.modePreference)
  const [comingOnline, setComingOnline] = useState(false)
  const { touch, webgl } = useMemo(() => ({ touch: capabilities.isTouchFirst(), webgl: capabilities.hasWebGL2() }), [])

  const portfolioFirst = touch
  const note = !webgl ? NO_WEBGL_NOTE : touch ? TOUCH_NOTE : null

  const enter = (
    <div key="enter" className="flex flex-col gap-2">
      <button
        type="button"
        disabled={!webgl}
        aria-describedby={note ? noteId : undefined}
        data-remembered={remembered === 'world' ? '' : undefined}
        className={`${portfolioFirst ? secondary : primary} ${remembered === 'world' ? 'ring-4 ring-moss ring-offset-4 ring-offset-void' : ''}`}
        onClick={() => {
          setModePreference('world')
          if (WORLD_AVAILABLE) setPhase('loading3d')
          else setComingOnline(true)
        }}
      >
        ENTER SIMULATION
      </button>
      {note && (
        <p id={noteId} className="m-0 max-w-sm text-ash">
          {note}
        </p>
      )}
      {comingOnline && <p className="m-0 text-ash">Simulation coming online.</p>}
    </div>
  )
  const portfolio = (
    <div key="portfolio" className="flex flex-col gap-2">
      <button
        type="button"
        data-remembered={remembered === 'portfolio' ? '' : undefined}
        className={`${portfolioFirst ? primary : secondary} ${remembered === 'portfolio' ? 'ring-4 ring-moss ring-offset-4 ring-offset-void' : ''}`}
        onClick={() => {
          setModePreference('portfolio')
          setPhase('portfolio')
        }}
      >
        VIEW PORTFOLIO
      </button>
    </div>
  )

  return (
    <main className="flex min-h-svh flex-col justify-center gap-10 px-6 pt-24 pb-12 md:px-16">
      <h1 className="display m-0 text-6xl md:text-[9rem]">NULLSPACE</h1>
      <p className="m-0 max-w-xl text-lg text-ash">A guided walk through a game and VR developer's CV, or the same CV as a plain page.</p>
      <div className="flex flex-col items-start gap-6 md:flex-row">{portfolioFirst ? [portfolio, enter] : [enter, portfolio]}</div>
    </main>
  )
}
