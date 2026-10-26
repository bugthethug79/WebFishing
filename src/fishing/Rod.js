// Low-poly fishing rod. Built pointing down local +Z from the hand,
// with an anchor at the tip for the line.

import * as THREE from 'three';
import { flatMat, part } from '../world/props/materials.js';

export const ROD_LENGTH = 2.1;

// def: a rod from economy/items.js (colours); defaults to the starter look.
export function createRod(def = { color: 0x6b4128, tip: 0xff5a4f }) {
  const root = new THREE.Group();
  // Tilt the rod slightly upward relative to the forearm.
  root.rotation.x = -0.25;

  const along = (geo, z) => {
    geo.rotateX(Math.PI / 2);
    geo.translate(0, 0, z);
    return geo;
  };

  // Cork handle, a little reel, then the tapering blank.
  root.add(part(along(new THREE.CylinderGeometry(0.05, 0.055, 0.4, 6), 0.05), flatMat(0xc98d5a)));
  const reel = part(new THREE.CylinderGeometry(0.09, 0.09, 0.07, 8), flatMat(0x3b4a6b), 0.06, -0.06, 0.18);
  reel.rotation.z = Math.PI / 2;
  root.add(reel);
  root.add(part(along(new THREE.CylinderGeometry(0.025, 0.045, ROD_LENGTH - 0.25, 5), 0.25 + (ROD_LENGTH - 0.25) / 2), flatMat(def.color, def.id === 'golden' ? { metalness: 0.5, roughness: 0.35 } : {})));
  // Bright tip so the rod reads at a distance.
  root.add(part(along(new THREE.CylinderGeometry(0.02, 0.025, 0.2, 5), ROD_LENGTH - 0.1), flatMat(def.tip)));

  const tip = new THREE.Object3D();
  tip.position.z = ROD_LENGTH;
  root.add(tip);

  return { object: root, tip };
}
