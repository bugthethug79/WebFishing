// Bright, warm daytime lighting with a sun that casts soft shadows near the player.

import * as THREE from 'three';
import { PALETTE } from '../config.js';

export function createLighting(scene) {
  const hemi = new THREE.HemisphereLight(0xcff6ff, 0xf5d7a0, 1.6);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff1d6, 2.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const s = 28;
  Object.assign(sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 1, far: 120 });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);

  const sunOffset = new THREE.Vector3(18, 32, 14);

  scene.background = new THREE.Color(PALETTE.sky);
  scene.fog = new THREE.Fog(PALETTE.fog, 55, 130);

  return {
    // Keep the shadow frustum centred on whatever we're looking at.
    follow(target) {
      sun.position.copy(target).add(sunOffset);
      sun.target.position.copy(target);
    },
  };
}
