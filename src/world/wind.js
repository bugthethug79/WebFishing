// Wind sway for foliage. Batched static meshes carry a per-vertex `aSway` weight
// (0 at the base, up to 1 at the top of a tree); this patches their material's
// vertex shader to push those vertices around with a gentle, gusty breeze.
// Meshes without the attribute read aSway = 0 and stay still, so sharing
// materials with non-swaying objects is fine.

export const windUniforms = {
  uTime: { value: 0 },
  uWind: { value: 1 }, // strength: 1 calm, ~2.5 in a rainstorm
};

const SWAY_GLSL = /* glsl */ `
  float s = aSway * uWind;
  if (s > 0.0) {
    vec3 wp = (modelMatrix * vec4(transformed, 1.0)).xyz;
    float phase = wp.x * 0.35 + wp.z * 0.27;
    float gust = 0.6 + 0.4 * sin(uTime * 0.4 + wp.x * 0.05);
    transformed.x += s * gust * (sin(uTime * 1.6 + phase) * 0.09 + sin(uTime * 3.3 + phase * 1.7) * 0.025);
    transformed.z += s * gust * cos(uTime * 1.3 + phase) * 0.06;
  }
`;

export function addSway(material) {
  if (material.userData.sway) return;
  material.userData.sway = true;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = windUniforms.uTime;
    shader.uniforms.uWind = windUniforms.uWind;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aSway;\nuniform float uTime;\nuniform float uWind;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${SWAY_GLSL}`);
  };
  material.customProgramCacheKey = () => 'sway';
  material.needsUpdate = true;
}

// Tag a prop so batching gives it sway weights. height: where sway reaches full strength.
export function swayable(object, amount, height) {
  object.userData.sway = amount;
  object.userData.swayHeight = height;
  return object;
}
