// Renders each species' 3D model to a small transparent PNG for menus.
// Done lazily with one shared offscreen renderer, then cached.

import * as THREE from 'three';
import { FISH_BY_ID } from '../collection/fishData.js';
import { createFishModel } from '../fishing/fishModel.js';

const SIZE = 160;
const cache = new Map();
let ctx = null;

function getContext() {
  if (ctx) return ctx;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(SIZE, SIZE);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0xbfd9e6, 2.2));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(1, 2, 3);
  scene.add(sun);

  // Mostly side-on, slightly above and in front, so rays and flatfish still read.
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 20);
  camera.position.set(0.5, 1.1, 3.4);
  camera.lookAt(0, 0, 0);

  ctx = { renderer, scene, camera };
  return ctx;
}

export function getFishIcon(speciesId) {
  if (cache.has(speciesId)) return cache.get(speciesId);
  const species = FISH_BY_ID[speciesId];
  const { renderer, scene, camera } = getContext();

  const { object } = createFishModel(species, species.size[1]);
  object.scale.setScalar(1);
  object.rotation.y = -0.25; // a touch of 3/4 view
  if (species.shape === 'ray') object.rotation.x = 1.0; // show the wings from above
  object.updateMatrixWorld(true);

  // Fit the model into the frame regardless of shape.
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const fit = 1.6 / Math.max(size.x, size.y * 1.1, size.z * 0.9);
  object.scale.setScalar(fit);
  object.position.copy(center).multiplyScalar(-fit);

  scene.add(object);
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/png');
  scene.remove(object);

  cache.set(speciesId, url);
  return url;
}
