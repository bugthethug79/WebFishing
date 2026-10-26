// Small non-colliding details: flowers and grass tufts.

import * as THREE from 'three';
import { PALETTE } from '../../config.js';
import { flatMat } from './materials.js';

export function createFlower(rng) {
  const g = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 3), flatMat(PALETTE.grassDark));
  stem.position.y = 0.15;
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.09, 0), flatMat(rng.pick(PALETTE.flowers)));
  head.position.y = 0.32;
  g.add(stem, head);
  return g;
}

export function createTuft(rng) {
  const g = new THREE.Group();
  const mat = flatMat(rng() > 0.5 ? PALETTE.grassDark : PALETTE.grassLight);
  for (let i = 0; i < 3; i++) {
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.35, 3), mat);
    blade.position.set((i - 1) * 0.08, 0.17, (rng() - 0.5) * 0.08);
    blade.rotation.z = (i - 1) * 0.35;
    g.add(blade);
  }
  return g;
}
