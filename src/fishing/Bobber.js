// Classic red-and-white bobber.

import * as THREE from 'three';
import { flatMat, part } from '../world/props/materials.js';

export function createBobber() {
  const g = new THREE.Group();
  const top = new THREE.SphereGeometry(0.16, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2);
  const bottom = new THREE.SphereGeometry(0.16, 8, 4, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  g.add(part(top, flatMat(0xff4b4b)));
  g.add(part(bottom, flatMat(0xffffff)));
  g.add(part(new THREE.CylinderGeometry(0.02, 0.02, 0.16, 4), flatMat(0xff4b4b), 0, 0.2, 0));
  return g;
}
