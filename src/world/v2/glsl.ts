/** Cheap 3D value noise shared by the v2 shaders (hash-based, no textures). */
export const NOISE_GLSL = /* glsl */ `
float nsHash(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}
float nsNoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(nsHash(i), nsHash(i + vec3(1, 0, 0)), f.x), mix(nsHash(i + vec3(0, 1, 0)), nsHash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(nsHash(i + vec3(0, 0, 1)), nsHash(i + vec3(1, 0, 1)), f.x), mix(nsHash(i + vec3(0, 1, 1)), nsHash(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}
`

/** Vertex snippet: world position and world normal for standard materials, instancing-aware. */
export const WORLD_VARYINGS_VERTEX = /* glsl */ `
  vec4 nsWp = vec4(transformed, 1.0);
  vec3 nsN = objectNormal;
  #ifdef USE_INSTANCING
    nsWp = instanceMatrix * nsWp;
    nsN = mat3(instanceMatrix) * nsN;
  #endif
  vWPos = (modelMatrix * nsWp).xyz;
  vWNormal = normalize(mat3(modelMatrix) * nsN);
  vOPos = position;
`
