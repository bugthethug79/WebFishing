// Renders small 3D models (fish, hats, rods) to transparent PNGs for menus.
// One shared offscreen renderer, results cached by key.

import * as THREE from 'three';

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

  // Mostly side-on, slightly above and in front.
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 20);
  camera.position.set(0.5, 1.1, 3.4);
  camera.lookAt(0, 0, 0);

  ctx = { renderer, scene, camera };
  return ctx;
}

// build(): returns a fresh Object3D. fitWeights scale how much each axis counts when fitting.
export function getIcon(key, build, { fitWeights = [1, 1.1, 0.9] } = {}) {
  if (cache.has(key)) return cache.get(key);
  const { renderer, scene, camera } = getContext();

  const object = build();
  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const fit = 1.6 / Math.max(size.x * fitWeights[0], size.y * fitWeights[1], size.z * fitWeights[2]);

  // Wrap so fitting doesn't fight the object's own transform.
  const holder = new THREE.Group();
  holder.add(object);
  object.position.sub(center);
  holder.scale.setScalar(fit);

  scene.add(holder);
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/png');
  scene.remove(holder);

  cache.set(key, url);
  return url;
}
