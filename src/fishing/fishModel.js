// Simple procedural low-poly fish, oriented along +X (head) with the tail at -X.

import * as THREE from 'three';
import { flatMat, part } from '../world/props/materials.js';

export function createFishModel(species, sizeCm) {
  const g = new THREE.Group();
  const puffy = species.id === 'pufferfish';

  const bodyGeo = new THREE.IcosahedronGeometry(0.3, 1);
  bodyGeo.scale(puffy ? 1.1 : 1.6, puffy ? 1.0 : 0.85, puffy ? 1.0 : 0.55);
  g.add(part(bodyGeo, flatMat(species.color)));

  const tailGeo = new THREE.ConeGeometry(0.22, 0.32, 4);
  tailGeo.rotateZ(Math.PI / 2);
  tailGeo.scale(1, 1, 0.25);
  const tail = part(tailGeo, flatMat(species.fin), -0.58, 0, 0);
  g.add(tail);

  const finGeo = new THREE.ConeGeometry(0.12, 0.25, 3);
  finGeo.scale(1.4, 1, 0.3);
  g.add(part(finGeo, flatMat(species.fin), -0.05, puffy ? 0.32 : 0.28, 0));

  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 4), flatMat(0x1e1e28));
    eye.position.set(puffy ? 0.22 : 0.32, 0.06, side * (puffy ? 0.26 : 0.15));
    g.add(eye);
  }

  // Map real size to a readable in-game scale (tiny fish still visible, big ones impressive).
  g.scale.setScalar(0.6 + Math.min(1.6, sizeCm / 60));
  return { object: g, tail };
}
