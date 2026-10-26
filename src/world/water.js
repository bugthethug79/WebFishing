// Animated low-poly water surface plus a foam band hugging the shoreline.

import * as THREE from 'three';
import { PALETTE, WORLD } from '../config.js';
import { shoreRadius } from './island.js';

const WAVE_GLSL = /* glsl */ `
  float waveHeight(vec2 p, float t) {
    return 0.05 * sin(p.x * 0.6 + t * 1.1)
         + 0.04 * sin(p.y * 0.8 - t * 1.3)
         + 0.025 * sin((p.x + p.y) * 1.4 + t * 2.0);
  }
`;

export function waveHeight(x, z, t) {
  return (
    0.05 * Math.sin(x * 0.6 + t * 1.1) +
    0.04 * Math.sin(z * 0.8 - t * 1.3) +
    0.025 * Math.sin((x + z) * 1.4 + t * 2.0)
  );
}

export function createWater() {
  const uniforms = { uTime: { value: 0 } };

  // Dense near the island for visible facets, plain far away.
  const near = new THREE.PlaneGeometry(140, 140, 110, 110).rotateX(-Math.PI / 2);
  const material = new THREE.MeshStandardMaterial({
    color: PALETTE.water,
    transparent: true,
    opacity: 0.72,
    roughness: 0.2,
    metalness: 0.0,
    flatShading: true,
    depthWrite: false, // lets the foam always sit on top of the surface
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\nuniform float uTime;\n${WAVE_GLSL}`)
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>\ntransformed.y += waveHeight(transformed.xz, uTime);`,
      );
  };

  const surface = new THREE.Mesh(near, material);
  surface.position.y = WORLD.waterLevel;
  surface.receiveShadow = true;
  surface.renderOrder = 1;

  // Far ocean (static, square with a hole for the animated part) so the sea reaches the fog.
  const outerShape = new THREE.Shape()
    .moveTo(-1000, -1000).lineTo(1000, -1000).lineTo(1000, 1000).lineTo(-1000, 1000).closePath();
  outerShape.holes.push(new THREE.Path().moveTo(-70, -70).lineTo(-70, 70).lineTo(70, 70).lineTo(70, -70).closePath());
  const far = new THREE.Mesh(
    new THREE.ShapeGeometry(outerShape).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: PALETTE.water, transparent: true, opacity: 0.72, roughness: 0.3 }),
  );
  far.position.y = WORLD.waterLevel;
  far.renderOrder = 1;

  const foam = createFoam(uniforms);

  const group = new THREE.Group();
  group.add(surface, far, foam);
  group.name = 'water';

  return {
    group,
    update(time) {
      uniforms.uTime.value = time;
    },
  };
}

function createFoam(uniforms) {
  const segments = 360;
  const inner = -0.25; // slightly up the beach
  const outer = 1.4; // out to sea
  const positions = [];
  const uvs = [];
  const indices = [];

  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    const r = shoreRadius(theta);
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    positions.push(cos * (r + inner), 0, sin * (r + inner));
    positions.push(cos * (r + outer), 0, sin * (r + outer));
    uvs.push(i / segments, 0, i / segments, 1);
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);

  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: uniforms.uTime, uColor: { value: new THREE.Color(PALETTE.foam) } },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      uniform float uTime;
      varying vec2 vUv;
      ${WAVE_GLSL}
      void main() {
        vUv = uv;
        vec3 p = position;
        p.y = waveHeight(p.xz, uTime) + 0.03;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uColor;
      varying vec2 vUv;
      void main() {
        float along = vUv.x * 6.2831;
        // Solid line at the water's edge.
        float edge = 1.0 - smoothstep(0.08, 0.2, vUv.y);
        // A wave of foam that rolls in toward the beach and fades.
        float phase = fract(uTime * 0.18 + sin(along * 7.0) * 0.06);
        float band = 1.0 - smoothstep(0.0, 0.07, abs(vUv.y - (1.0 - phase)));
        band *= smoothstep(0.0, 0.3, phase) * (1.0 - phase);
        // Break the band up so it reads as foam, not a ring.
        float breakup = step(0.35, fract(sin(floor(vUv.x * 240.0)) * 43758.5453));
        float a = max(edge * 0.9, band * breakup * 0.8);
        if (a < 0.02) discard;
        gl_FragColor = vec4(uColor, a);
      }
    `,
  });

  const mesh = new THREE.Mesh(geo, material);
  mesh.renderOrder = 2;
  return mesh;
}
