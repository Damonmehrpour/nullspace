// Test-only control surface (built only with VITE_TEST_HOOKS=true). Lets end-to-end tests drive the
// simulation on a frozen, deterministic clock instead of waiting on wall-clock time.
import { WORLD } from '../content/world'
import type { SectionId } from '../content/schema'
import type { Vec2 } from '../core/geometry'
import type { GuideStateName } from '../core/guideBrain'
import { arrivalNodeId, nearestNode, shortestPath } from '../core/routeGraph'
import { isTourComplete } from '../core/tour'
import { useStore } from '../state/store'
import { graph, sim, simulate, teleportPlayer } from './sim'

export type NullspaceHooks = {
  freezeClock(): void
  advance(seconds: number): void
  teleportPlayer(to: SectionId | 'spawn' | Vec2): void
  walkPlayerTo(id: SectionId): void
  placeGuideAtTarget(): void
  getGuideState(): GuideStateName
  getTourTarget(): SectionId | null
  getWorldVisited(): SectionId[]
  getViewed(): SectionId[]
  isTourComplete(): boolean
  isRevealing(): boolean
  say(text: string): void
  interactArtifact(i: 0 | 1 | 2): void
}

const STEP = 1 / 60

export function installTestHooks(): void {
  const hooks: NullspaceHooks = {
    freezeClock: () => {
      sim.frozen = true
    },
    advance: (seconds) => {
      for (let i = 0; i < Math.round(seconds * 60); i++) simulate(STEP)
    },
    teleportPlayer: (to) => {
      if (to === 'spawn') teleportPlayer(WORLD.spawn.pos)
      else if (typeof to === 'string') teleportPlayer(WORLD.islands.find((i) => i.id === to)!.arrivalPoint)
      else teleportPlayer(to)
    },
    walkPlayerTo: (id) => {
      sim.autopilot = shortestPath(graph, nearestNode(graph, sim.player.pos), arrivalNodeId(id))
    },
    placeGuideAtTarget: () => {
      const g = sim.guide
      if (!g.target || g.path.length === 0) return
      sim.guide = { ...g, name: 'lead', pos: g.path[g.path.length - 1], pathIndex: g.path.length, timer: 0, met: true }
    },
    getGuideState: () => sim.guide.name,
    getTourTarget: () => useStore.getState().tourTarget,
    getWorldVisited: () => [...useStore.getState().worldVisited],
    getViewed: () => [...useStore.getState().viewed],
    isTourComplete: () => isTourComplete(WORLD.tourOrder, useStore.getState().worldVisited),
    isRevealing: () => useStore.getState().revealing !== null,
    say: (text) => useStore.getState().say(text),
    interactArtifact: (i) => {
      const slot = WORLD.islands.find((x) => x.id === 'projects')!.artifactSlots[i]
      teleportPlayer({ x: slot.x + 0.4, z: slot.z })
      const input = sim.input
      if (!input) return
      input.state.interact = false
      simulate(STEP)
      input.state.interact = true
      simulate(STEP)
      input.state.interact = false
    },
  }
  ;(window as unknown as { __nullspace: NullspaceHooks }).__nullspace = hooks
}
