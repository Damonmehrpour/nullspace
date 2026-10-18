import { create } from 'zustand'
import type { ProjectId, SectionId } from '../content/schema'
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
  openSection: (id) => set((s) => ({ panel: { kind: 'section', id }, viewed: withAdded(s.viewed, id) })),
  openProject: (id) => set((s) => ({ panel: { kind: 'project', id }, viewed: withAdded(s.viewed, 'projects') })),
  closePanel: () => set({ panel: null }),
  markWorldVisited: (id) => set((s) => ({ worldVisited: withAdded(s.worldVisited, id) })),
  markRevealPlayed: (id) => set((s) => ({ revealPlayed: withAdded(s.revealPlayed, id) })),
  setTourTarget: (tourTarget) => set({ tourTarget }),
  setRevealing: (revealing) => set({ revealing }),
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
