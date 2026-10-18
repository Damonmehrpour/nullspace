import { create } from 'zustand'
import type { ProjectId, SectionId } from '../content/schema'
import { WORLD } from '../content/world'
import { revealDurationMs } from '../core/arrival'
import type { Vec2 } from '../core/geometry'
import { nextTarget } from '../core/tour'
import { isReducedMotion } from './reducedMotion'
import { DEFAULT_SETTINGS, loadModePreference, loadSettings, saveModePreference, saveSettings, type ModePreference, type Settings } from './settings'

export type { Settings } from './settings'

export type Phase = 'boot' | 'entry' | 'loading3d' | 'world' | 'portfolio'
export type PanelRef = { kind: 'section'; id: SectionId } | { kind: 'project'; id: ProjectId }
export type OpenSource = 'arrival' | 'quicknav' | 'portfolio' | 'artifact'

type Data = {
  phase: Phase
  panel: PanelRef | null
  /** Content opened from any source. Informational only — never drives the tour. */
  viewed: Set<SectionId>
  /** Arrival zones physically entered in 3D. The only input to the tour. */
  worldVisited: Set<SectionId>
  revealPlayed: Set<SectionId>
  tourTarget: SectionId | null
  revealing: SectionId | null
  /** Seconds since the current reveal started (simulated clock). */
  revealElapsed: number
  /** Arrival point the player should be moved to on the next simulation step (touch "Guide me there"). */
  teleportRequest: Vec2 | null
  /** Current kokedama line; id changes on every new line so repeats re-trigger. */
  subtitle: { text: string; id: number } | null
  /** Where the most recent panel was opened from (drives the skipTour line). */
  lastOpenSource: OpenSource | null
  settings: Settings
  modePreference: ModePreference | null
}

type Actions = {
  setPhase(p: Phase): void
  openSection(id: SectionId, o: { source: OpenSource }): void
  openProject(id: ProjectId, o: { source: OpenSource }): void
  closePanel(): void
  markWorldVisited(id: SectionId): void
  markRevealPlayed(id: SectionId): void
  setTourTarget(id: SectionId | null): void
  setRevealing(id: SectionId | null): void
  /** The player physically entered an island's arrival zone. */
  arrive(id: SectionId): void
  /** Advances a running reveal; opens the panel when it finishes. Driven by the simulation clock. */
  tickReveal(dt: number): void
  guideMeThere(id: SectionId, touch: boolean): void
  clearTeleport(): void
  say(text: string): void
  clearSubtitle(id: number): void
  updateSettings(p: Partial<Settings>): void
  setModePreference(m: ModePreference): void
}

export type StoreState = Data & Actions

/** Fresh default data, ignoring storage (tests reset with this). */
export function initialState(): Data {
  return {
    phase: 'boot',
    panel: null,
    viewed: new Set(),
    worldVisited: new Set(),
    revealPlayed: new Set(),
    tourTarget: null,
    revealing: null,
    revealElapsed: 0,
    teleportRequest: null,
    subtitle: null,
    lastOpenSource: null,
    settings: { ...DEFAULT_SETTINGS },
    modePreference: null,
  }
}

/** Default data merged with persisted settings and mode preference. */
export function loadInitialState(): Data {
  return { ...initialState(), settings: loadSettings(), modePreference: loadModePreference() }
}

const withAdded = <T>(set: Set<T>, v: T): Set<T> => (set.has(v) ? set : new Set(set).add(v))

export const useStore = create<StoreState>()((set, get) => ({
  ...loadInitialState(),
  setPhase: (phase) => set({ phase }),
  openSection: (id, o) => set((s) => ({ panel: { kind: 'section', id }, viewed: withAdded(s.viewed, id), lastOpenSource: o.source })),
  openProject: (id, o) => set((s) => ({ panel: { kind: 'project', id }, viewed: withAdded(s.viewed, 'projects'), lastOpenSource: o.source })),
  closePanel: () =>
    set((s) => ({
      panel: null,
      ...(s.phase === 'world' ? { tourTarget: nextTarget(WORLD.tourOrder, s.worldVisited) } : {}),
    })),
  markWorldVisited: (id) => set((s) => ({ worldVisited: withAdded(s.worldVisited, id) })),
  markRevealPlayed: (id) => set((s) => ({ revealPlayed: withAdded(s.revealPlayed, id) })),
  setTourTarget: (tourTarget) => set({ tourTarget }),
  setRevealing: (revealing) => set({ revealing, revealElapsed: 0 }),
  arrive: (id) => {
    const s = get()
    if (s.panel || s.revealing) return
    s.markWorldVisited(id)
    if (s.revealPlayed.has(id)) s.openSection(id, { source: 'arrival' })
    else s.setRevealing(id)
  },
  tickReveal: (dt) => {
    const s = get()
    if (!s.revealing) return
    const id = s.revealing
    const elapsed = s.revealElapsed + dt
    if (elapsed * 1000 < revealDurationMs(id, s.revealPlayed, isReducedMotion(s.settings))) {
      set({ revealElapsed: elapsed })
      return
    }
    set({ revealing: null, revealElapsed: 0 })
    get().markRevealPlayed(id)
    get().openSection(id, { source: 'arrival' })
  },
  guideMeThere: (id, touch) => {
    const island = WORLD.islands.find((i) => i.id === id)!
    set({ tourTarget: id, teleportRequest: touch ? island.arrivalPoint : null })
  },
  clearTeleport: () => set({ teleportRequest: null }),
  say: (text) => set((s) => ({ subtitle: { text, id: (s.subtitle?.id ?? 0) + 1 } })),
  clearSubtitle: (id) => set((s) => (s.subtitle?.id === id ? { subtitle: null } : {})),
  updateSettings: (p) => {
    const settings = { ...get().settings, ...p }
    saveSettings(settings)
    set({ settings })
  },
  setModePreference: (modePreference) => {
    saveModePreference(modePreference)
    set({ modePreference })
  },
}))

export const isGameplayPaused = (s: Pick<StoreState, 'panel'>) => s.panel !== null
