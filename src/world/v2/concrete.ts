import { Color, MeshLambertMaterial, type Side } from 'three'
import { NOISE_GLSL, WORLD_VARYINGS_VERTEX } from './glsl'

const cache = new Map<string, MeshLambertMaterial>()

/** Shared by every concrete material: 1 = full surface detail, 0 = flat (adaptive quality Low). */
export const CONCRETE_DETAIL = { value: 1 }

/** Bevel radius baked into `bevelUnitBox()`; the shader rescales it to BEVEL_WORLD metres per instance. */
export const BEVEL_UNIT = 0.1
const BEVEL_WORLD = 0.045

/**
 * Vertex snippet for instanced unit rounded boxes (every vertex lies in a corner zone, |c| ≥ 0.5 − r):
 * keeps the bevel a fixed world size whatever each instance's non-uniform scale, instead of
 * stretching it. Clamped to 45% of the smallest side so flattened instances (reveals) stay valid.
 */
const BEVEL_VERTEX = /* glsl */ `
  #ifdef USE_INSTANCING
    vec3 nsS = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
    vec3 nsCore = sign(transformed) * 0.5;
    vec3 nsOff = (transformed - nsCore) / ${BEVEL_UNIT.toFixed(3)};
    transformed = nsCore + nsOff * min(vec3(${BEVEL_WORLD.toFixed(3)}), nsS * 0.45) / max(nsS, vec3(1e-4));
  #endif
`

/**
 * Cast-concrete material for the v2 look: one shader reused everywhere (one compile).
 * Lambert, not PBR: on roughness-0.9 concrete the GGX specular is invisible but was ~35% of the
 * frame on a fill-bound GPU (measured by material swap); the diffuse response is the same BRDF.
 * All "lighting detail" is computed per pixel instead of with shadow maps:
 *  - aggregate + staining from world-space noise, faint horizontal board-form lines
 *  - ground-contact darkening on walls near the walkable plane (fake ambient occlusion)
 *  - darker undersides, and rock that fades into the void the deeper it hangs
 */
export function concreteMaterial(color = '#e9e6df', opts: { emissive?: string; side?: Side; bevel?: boolean; lite?: boolean } = {}): MeshLambertMaterial {
  const key = `${color}|${opts.emissive ?? ''}|${opts.side ?? 0}|${opts.bevel ? 'b' : ''}|${opts.lite ? 'l' : ''}`
  const hit = cache.get(key)
  if (hit) return hit

  const m = new MeshLambertMaterial({ color: new Color(color), side: opts.side ?? 0 })
  if (opts.emissive) {
    m.emissive = new Color(opts.emissive)
    m.emissiveIntensity = 1
  }
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uDetail = CONCRETE_DETAIL
    shader.vertexShader = 'varying vec3 vWPos;\nvarying vec3 vWNormal;\nvarying vec3 vOPos;\n' + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n${opts.bevel ? BEVEL_VERTEX : ''}${WORLD_VARYINGS_VERTEX}`)
    shader.fragmentShader =
      'varying vec3 vWPos;\nvarying vec3 vWNormal;\nvarying vec3 vOPos;\nuniform float uDetail;\n' +
      NOISE_GLSL +
      shader.fragmentShader.replace(
        '#include <color_fragment>',
        /* glsl */ `#include <color_fragment>
  float nsAgg = 0.5;
  float nsStain = 0.0;
  if (uDetail > 0.5) {
    // Finest octave is a single hash per ~3 cm cell (1–2 px at play distance): reads as aggregate at 1/8 the cost.
${
      opts.lite
        ? // Lite (many small buildings): coarse aggregate and the cheap grain only; no staining pass.
          'nsAgg = nsNoise(vWPos * 1.6) * 0.8 + nsHash(floor(vWPos * 31.0)) * 0.2;'
        : `nsAgg = nsNoise(vWPos * 1.6) * 0.55 + nsNoise(vWPos * 7.0) * 0.3 + nsHash(floor(vWPos * 31.0)) * 0.15;
    nsStain = smoothstep(0.55, 0.95, nsNoise(vec3(vWPos.x * 0.22, vWPos.y * 0.8, vWPos.z * 0.22))) * 0.16;`
    }
  }
  float nsBoard = smoothstep(0.965, 1.0, abs(sin(vWPos.y * 3.14159 / 0.55))) * 0.06 * (1.0 - abs(vWNormal.y));
  float nsWall = 1.0 - abs(vWNormal.y);
  float nsContact = 1.0 - (1.0 - smoothstep(0.0, 0.9, vWPos.y)) * 0.42 * nsWall * step(-0.05, vWPos.y);
  float nsUnder = mix(1.0, 0.35, smoothstep(0.1, -0.6, vWNormal.y));
  float nsDepth = mix(1.0, 0.05, smoothstep(-0.4, -5.0, vWPos.y));
  diffuseColor.rgb *= (0.84 + nsAgg * 0.24 - nsStain - nsBoard) * nsContact * nsUnder * nsDepth;`,
      )
  }
  m.customProgramCacheKey = () => `nullspace-concrete-v2${opts.bevel ? '-bevel' : ''}${opts.lite ? '-lite' : ''}`
  cache.set(key, m)
  return m
}

/**
 * Concrete with its own material instance, so one object can fade when it blocks the camera (see
 * FollowCamera's fadeOnBlock). It stays opaque until it actually fades (call syncFadeTransparency each
 * frame): transparent surfaces lose early depth rejection, and overlapping ones shade the same pixels
 * repeatedly. Both variants exist from startup (the monolith uses the transparent one), so switching
 * never compiles a shader.
 */
export function fadingConcreteMaterial(color: string, opts: { lite?: boolean } = {}): MeshLambertMaterial {
  const base = concreteMaterial(color, opts)
  const m = base.clone()
  m.onBeforeCompile = base.onBeforeCompile
  m.customProgramCacheKey = base.customProgramCacheKey
  return m
}

export function syncFadeTransparency(mats: MeshLambertMaterial[]): void {
  for (const m of mats) {
    const fading = m.opacity < 0.999
    if (m.transparent !== fading) {
      m.transparent = fading
      m.needsUpdate = true
    }
  }
}
