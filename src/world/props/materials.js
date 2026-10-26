// Shared flat-shaded materials, cached by colour so props reuse them.

import * as THREE from 'three';

const cache = new Map();

export function flatMat(color, opts = {}) {
  const key = `${color}|${JSON.stringify(opts)}`;
  if (!cache.has(key)) {
    cache.set(key, new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.9, ...opts }));
  }
  return cache.get(key);
}

// Mesh helper: create, enable shadows, position.
export function part(geometry, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// Randomly nudge vertices for an organic, hand-made look.
export function jitter(geometry, amount, rng) {
  const pos = geometry.attributes.position;
  const seen = new Map();
  for (let i = 0; i < pos.count; i++) {
    // Keep shared vertices together so the mesh doesn't crack.
    const key = `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`;
    if (!seen.has(key)) seen.set(key, [(rng() - 0.5) * amount, (rng() - 0.5) * amount, (rng() - 0.5) * amount]);
    const [dx, dy, dz] = seen.get(key);
    pos.setXYZ(i, pos.getX(i) + dx, pos.getY(i) + dy, pos.getZ(i) + dz);
  }
  geometry.computeVertexNormals();
  return geometry;
}
