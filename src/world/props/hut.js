// A small fishing hut: the cozy landmark next to the dock.

import * as THREE from 'three';
import { PALETTE } from '../../config.js';
import { flatMat, part } from './materials.js';

export function createHut() {
  const g = new THREE.Group();
  const w = 3.6;
  const d = 3;
  const h = 2.4;

  // Raised wooden floor/porch.
  g.add(part(new THREE.BoxGeometry(w + 1.2, 0.3, d + 1.6), flatMat(PALETTE.woodDark), 0, 0.15, 0.4));

  // Walls made of horizontal boards for a bit of texture.
  const boards = 6;
  for (let i = 0; i < boards; i++) {
    const color = i % 2 ? PALETTE.wood : 0xa7683a;
    g.add(part(new THREE.BoxGeometry(w, h / boards, d), flatMat(color), 0, 0.3 + (i + 0.5) * (h / boards), 0));
  }

  // Door + round window on the front (+Z).
  g.add(part(new THREE.BoxGeometry(0.9, 1.6, 0.08), flatMat(0x5e3a22), -0.8, 0.3 + 0.8, d / 2 + 0.03));
  // Own material (not the shared cache) so the window can glow at night.
  const windowMaterial = new THREE.MeshStandardMaterial({ color: 0x3d7fa6, flatShading: true, roughness: 0.4 });
  const win = part(new THREE.CylinderGeometry(0.38, 0.38, 0.1, 10), windowMaterial, 0.8, 1.7, d / 2 + 0.03);
  win.rotation.x = Math.PI / 2;
  const rim = part(new THREE.TorusGeometry(0.4, 0.07, 4, 10), flatMat(0xe8eef0), 0.8, 1.7, d / 2 + 0.07);
  g.add(win, rim);

  // Sloped roof: two slabs meeting at a ridge.
  const roofMat = flatMat(PALETTE.roof);
  for (const side of [-1, 1]) {
    const slab = part(new THREE.BoxGeometry(w + 0.8, 0.16, d / 2 + 1.1), roofMat, 0, 0.3 + h + 0.45, side * (d / 4 + 0.35));
    slab.rotation.x = side * 0.42;
    g.add(slab);
  }

  // Porch posts.
  for (const sx of [-1, 1]) {
    g.add(part(new THREE.CylinderGeometry(0.08, 0.08, h + 0.4, 6), flatMat(PALETTE.woodDark), sx * (w / 2 + 0.4), 0.3 + (h + 0.4) / 2, d / 2 + 1.0));
  }

  // A couple of buckets for flavour.
  g.add(part(new THREE.CylinderGeometry(0.25, 0.2, 0.4, 8), flatMat(0x4aa3df), 1.6, 0.5, d / 2 + 0.6));
  g.add(part(new THREE.CylinderGeometry(0.25, 0.2, 0.4, 8), flatMat(0xf4f4f4), 1.0, 0.5, d / 2 + 0.75));

  return { object: g, halfW: (w + 1.2) / 2, halfD: (d + 1.6) / 2, offsetZ: 0.4, windowMaterial };
}
