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
import { type Color, Mesh, MeshLambertMaterial, Vector3, MeshStandardMaterial, type Material } from 'three'
import { soundRunning } from '../audio/soundscape'
import { applyLook } from '../core/cameraRig'
import { CONCRETE_DETAIL } from './v2/concrete'
import { guideCue } from './v2/cues'

const concreteOriginals = new Map<Mesh, Material>()

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
  /** Places player and camera for screenshots: player at pos, camera looking along yaw. */
  setView(pos: Vec2, yaw: number): void
  markAllRevealed(): void
  getRenderInfo(): { calls: number; triangles: number }
  getQuality(): { chosen: string; effective: string; reducedDpr: boolean }
  setCamera(pos: [number, number, number] | null, look?: [number, number, number]): void
  placeGuide(pos: Vec2, facing?: number): void
  getPlayer(): { pos: Vec2; facing: number }
  setPlayerFacing(facing: number): void
  getGuideCue(): number
  soundRunning(): boolean
  look(yaw: number, pitch: number, zoom: number): void
  getCameraInfo(): { position: [number, number, number]; forward: [number, number, number]; yaw: number; pitch: number; zoom: number; facing: number }
  materialsUnder(name: string): { mesh: string; type: string; color: string; emissive: string | null }[]
  /** Pins the quality (High by default) and stops adaptation: deterministic screenshots and profiles. */
  lockQuality(level?: 'high' | 'medium' | 'low'): void
  /** Stops adaptive quality without changing the visitor's setting. */
  holdQuality(): void
  startTimeline(): void
  /** Ablation: hide/show every object whose name starts with prefix; returns how many matched. */
  setVisibleByName(prefix: string, visible: boolean): number
  listPrograms(): string[]
  setConcreteDetail(on: boolean): void
  swapConcrete(mode: 'v2' | 'plain' | 'lambert'): number
  triangles(prefix: string): number
  getTimeline(): { t: number; dt: number; programs: number; calls: number; quality: string }[]
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
    setView: (pos, yaw) => {
      teleportPlayer(pos)
      sim.rig = { ...sim.rig, yaw, aim: pos }
    },
    getRenderInfo: () => sim.renderInfo,
    getQuality: () => sim.quality,
    setCamera: (pos, look) => {
      sim.cameraOverride = pos && look ? { pos, look } : null
    },
    setVisibleByName: (prefix, visible) => {
      let n = 0
      sim.scene?.traverse((o) => {
        if (o.name.startsWith(prefix)) {
          o.visible = visible
          n++
        }
      })
      return n
    },
    listPrograms: () => (sim.gl?.info.programs ?? []).map((p) => String(p.cacheKey ?? '').split(',').filter(Boolean).slice(0, 6).join(',').slice(0, 140)),
    setConcreteDetail: (on) => {
      CONCRETE_DETAIL.value = on ? 1 : 0
    },
    // Profiling: swap the v2 concrete shader for stock materials to separate shader cost from coverage.
    swapConcrete: (mode) => {
      let n = 0
      sim.scene?.traverse((o) => {
        if (!(o instanceof Mesh)) return
        const orig = concreteOriginals.get(o) ?? o.material
        if (!(orig instanceof MeshLambertMaterial) || orig.customProgramCacheKey() !== 'nullspace-concrete-v2') return
        concreteOriginals.set(o, orig)
        const opts = { color: orig.color, side: orig.side, transparent: orig.transparent }
        o.material = mode === 'v2' ? orig : mode === 'plain' ? new MeshStandardMaterial({ ...opts, roughness: 0.9 }) : new MeshLambertMaterial(opts)
        n++
      })
      return n
    },
    triangles: (prefix) => {
      let t = 0
      sim.scene?.traverse((o) => {
        if (o instanceof Mesh && o.name.startsWith(prefix)) {
          const g = o.geometry
          t += (g.index ? g.index.count : g.attributes.position.count) / 3
        }
      })
      return t
    },
    startTimeline: () => {
      sim.timeline = []
    },
    getTimeline: () => sim.timeline ?? [],
    holdQuality: () => {
      sim.qualityLocked = true
    },
    lockQuality: (level = 'high') => {
      useStore.getState().updateSettings({ quality: level })
      sim.qualityLocked = true
    },
    getPlayer: () => ({ pos: sim.player.pos, facing: sim.player.facing }),
    materialsUnder: (name) => {
      const out: { mesh: string; type: string; color: string; emissive: string | null }[] = []
      sim.scene?.getObjectByName(name)?.traverse((o) => {
        if (!(o instanceof Mesh)) return
        for (const m of [o.material].flat()) {
          const c = (m as { color?: Color }).color
          const e = (m as { emissive?: Color; emissiveIntensity?: number }).emissive
          const ei = (m as { emissiveIntensity?: number }).emissiveIntensity ?? 0
          out.push({ mesh: o.name, type: m.type, color: c ? c.getHexString() : '', emissive: e && ei > 0 ? e.getHexString() : null })
        }
      })
      return out
    },
    getGuideCue: () => guideCue.seq,
    soundRunning: () => soundRunning(),
    look: (yaw, pitch, zoom) => {
      sim.rig = applyLook(sim.rig, { yaw, pitch, zoom })
    },
    getCameraInfo: () => {
      const cam = sim.camera
      const f = cam ? cam.getWorldDirection(new Vector3()) : new Vector3()
      return { position: cam ? (cam.position.toArray() as [number, number, number]) : [0, 0, 0], forward: f.toArray() as [number, number, number], yaw: sim.rig.yaw, pitch: sim.rig.pitch, zoom: sim.rig.zoom, facing: sim.player.facing }
    },
    setPlayerFacing: (facing) => {
      sim.player = { ...sim.player, facing }
    },
    placeGuide: (pos, facing = 0) => {
      sim.guide = { ...sim.guide, name: 'idle', pos, path: [], pathIndex: 0, target: null, met: true, facing }
    },
    markAllRevealed: () => {
      for (const i of WORLD.islands) useStore.getState().markRevealPlayed(i.id)
    },
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
