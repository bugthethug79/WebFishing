// Menu icons for fish, hats and rods.

import * as THREE from 'three';
import { FISH_BY_ID } from '../collection/fishData.js';
import { createFishModel } from '../fishing/fishModel.js';
import { buildHat } from '../player/hats.js';
import { createRod } from '../fishing/Rod.js';
import { getIcon } from './iconRenderer.js';

export function getFishIcon(speciesId) {
  return getIcon(`fish:${speciesId}`, () => {
    const species = FISH_BY_ID[speciesId];
    const { object } = createFishModel(species, species.size[1]);
    object.scale.setScalar(1);
    object.rotation.y = -0.25; // a touch of 3/4 view
    if (species.shape === 'ray') object.rotation.x = 1.0; // show the wings from above
    return object;
  });
}

export function getHatIcon(hatId) {
  return getIcon(`hat:${hatId}`, () => {
    const g = buildHat(hatId);
    g.rotation.set(0.35, -0.5, 0);
    return g;
  }, { fitWeights: [1, 1.4, 1] });
}

export function getRodIcon(rod) {
  return getIcon(`rod:${rod.id}`, () => {
    const { object } = createRod(rod);
    const g = new THREE.Group();
    // Lay it along +X, then tilt up: tip toward the top-right.
    object.rotation.set(0, Math.PI / 2, 0.75, 'ZYX');
    g.add(object);
    return g;
  });
}
