// A wooden dock that juts out into the water.
// Built in local space pointing down +X, then placed by the caller.

import * as THREE from 'three';
import { PALETTE } from '../../config.js';
import { flatMat, part } from './materials.js';

export const DOCK = {
  length: 11,
  width: 2.6,
  deckHeight: 0.42,
};

export function createDock(rng) {
  const { length, width, deckHeight } = DOCK;
  const g = new THREE.Group();
  const plankW = 0.5;
  const count = Math.floor(length / (plankW + 0.05));

  for (let i = 0; i < count; i++) {
    const w = width + (rng() - 0.5) * 0.15;
    const plank = part(
      new THREE.BoxGeometry(plankW, 0.12, w),
      flatMat(rng() > 0.4 ? PALETTE.wood : PALETTE.woodDark),
      i * (plankW + 0.05) + plankW / 2,
      deckHeight - 0.06 + (rng() - 0.5) * 0.02,
      (rng() - 0.5) * 0.08,
    );
    plank.rotation.y = (rng() - 0.5) * 0.04;
    g.add(plank);
  }

  // Support beams under the planks.
  for (const side of [-1, 1]) {
    g.add(
      part(new THREE.BoxGeometry(length, 0.15, 0.18), flatMat(PALETTE.woodDark), length / 2, deckHeight - 0.2, side * (width / 2 - 0.25)),
    );
  }

  // Posts, taller ones near the end double as bollards.
  const postMat = flatMat(PALETTE.woodDark);
  const posts = [1.5, length / 2, length - 0.3];
  posts.forEach((px, i) => {
    for (const side of [-1, 1]) {
      const tall = i === posts.length - 1;
      const h = tall ? 4.2 : 3.6;
      const top = tall ? deckHeight + 0.6 : deckHeight + 0.05;
      g.add(part(new THREE.CylinderGeometry(0.16, 0.18, h, 6), postMat, px, top - h / 2, side * (width / 2 + 0.05)));
    }
  });

  return g;
}
