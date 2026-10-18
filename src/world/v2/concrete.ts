import { Color, MeshStandardMaterial, type Side } from 'three'
import { NOISE_GLSL, WORLD_VARYINGS_VERTEX } from './glsl'

const cache = new Map<string, MeshStandardMaterial>()

/** Shared by every concrete material: 1 = full surface detail, 0 = flat (adaptive quality Low). */
export const CONCRETE_DETAIL = { value: 1 }

/**
 * Cast-concrete material for the v2 look: one shader reused everywhere (one compile).
 * All "lighting detail" is computed per pixel instead of with shadow maps:
 *  - aggregate + staining from world-space noise, faint horizontal board-form lines
 *  - ground-contact darkening on walls near the walkable plane (fake ambient occlusion)
 *  - darker undersides, and rock that fades into the void the deeper it hangs
 */
export function concreteMaterial(color = '#e9e6df', opts: { emissive?: string; side?: Side } = {}): MeshStandardMaterial {
  const key = `${color}|${opts.emissive ?? ''}|${opts.side ?? 0}`
  const hit = cache.get(key)
  if (hit) return hit

  const m = new MeshStandardMaterial({ color: new Color(color), roughness: 0.9, metalness: 0, side: opts.side ?? 0 })
  if (opts.emissive) {
    m.emissive = new Color(opts.emissive)
    m.emissiveIntensity = 1
  }
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uDetail = CONCRETE_DETAIL
    shader.vertexShader = 'varying vec3 vWPos;\nvarying vec3 vWNormal;\nvarying vec3 vOPos;\n' + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n${WORLD_VARYINGS_VERTEX}`)
    shader.fragmentShader =
      'varying vec3 vWPos;\nvarying vec3 vWNormal;\nvarying vec3 vOPos;\nuniform float uDetail;\n' +
      NOISE_GLSL +
      shader.fragmentShader
        .replace(
          '#include <color_fragment>',
          /* glsl */ `#include <color_fragment>
  float nsAgg = 0.5;
  float nsStain = 0.0;
  if (uDetail > 0.5) {
    nsAgg = nsNoise(vWPos * 1.6) * 0.55 + nsNoise(vWPos * 7.0) * 0.3 + nsNoise(vWPos * 31.0) * 0.15;
    nsStain = smoothstep(0.55, 0.95, nsNoise(vec3(vWPos.x * 0.22, vWPos.y * 0.8, vWPos.z * 0.22))) * 0.16;
  }
  float nsBoard = smoothstep(0.965, 1.0, abs(sin(vWPos.y * 3.14159 / 0.55))) * 0.06 * (1.0 - abs(vWNormal.y));
  float nsWall = 1.0 - abs(vWNormal.y);
  float nsContact = 1.0 - (1.0 - smoothstep(0.0, 0.9, vWPos.y)) * 0.42 * nsWall * step(-0.05, vWPos.y);
  float nsUnder = mix(1.0, 0.35, smoothstep(0.1, -0.6, vWNormal.y));
  float nsDepth = mix(1.0, 0.05, smoothstep(-0.4, -5.0, vWPos.y));
  diffuseColor.rgb *= (0.84 + nsAgg * 0.24 - nsStain - nsBoard) * nsContact * nsUnder * nsDepth;`,
        )
        .replace(
          '#include <roughnessmap_fragment>',
          `#include <roughnessmap_fragment>
  roughnessFactor = clamp(roughnessFactor + (nsAgg - 0.5) * 0.25, 0.0, 1.0);`,
        )
  }
  m.customProgramCacheKey = () => 'nullspace-concrete-v2'
  cache.set(key, m)
  return m
}
