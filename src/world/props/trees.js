// Round "puffball" trees and palm trees.

import * as THREE from 'three';
import { PALETTE } from '../../config.js';
import { flatMat, part, jitter } from './materials.js';
import { swayable } from '../wind.js';

export function createRoundTree(rng, scale = 1) {
  const g = new THREE.Group();
  const trunkH = 1.4;
  g.add(part(new THREE.CylinderGeometry(0.18, 0.28, trunkH, 6), flatMat(PALETTE.trunk), 0, trunkH / 2, 0));

  const leaf = flatMat(rng.pick(PALETTE.leaves));
  const blobs = [
    [0, trunkH + 0.9, 0, 1.15],
    [0.55, trunkH + 0.55, 0.2, 0.8],
    [-0.5, trunkH + 0.6, -0.15, 0.8],
    [0.05, trunkH + 1.6, 0.05, 0.75],
  ];
  for (const [x, y, z, r] of blobs) {
    const geo = jitter(new THREE.IcosahedronGeometry(r, 1), 0.18, rng);
    g.add(part(geo, leaf, x, y, z));
  }

  g.scale.setScalar(scale);
  g.rotation.y = rng() * Math.PI * 2;
  swayable(g, 1, 4 * scale);
  return { object: g, radius: 0.45 * scale };
}

export function createPalm(rng, scale = 1) {
  const g = new THREE.Group();
  const trunkMat = flatMat(0x9c6b43);
  const segments = 6;
  const lean = rng.range(0.15, 0.35);
  let x = 0;
  let y = 0;
  // Stack slightly offset trunk segments for a gentle curve.
  for (let i = 0; i < segments; i++) {
    const h = 0.7;
    const r = 0.2 - i * 0.015;
    const seg = part(new THREE.CylinderGeometry(r * 0.85, r, h, 6), trunkMat, x, y + h / 2, 0);
    seg.rotation.z = -lean * (i / segments);
    g.add(seg);
    x += Math.sin(lean * (i / segments)) * h;
    y += Math.cos(lean * (i / segments)) * h * 0.98;
  }

  const top = new THREE.Group();
  top.position.set(x, y, 0);
  g.add(top);
  top.add(part(new THREE.IcosahedronGeometry(0.25, 0), flatMat(0x7a4f2f)));

  const fronds = 7;
  for (let i = 0; i < fronds; i++) {
    const frond = new THREE.Group();
    frond.rotation.y = (i / fronds) * Math.PI * 2 + rng() * 0.3;
    // A frond is a flattened, drooping cone pointing outward.
    const geo = new THREE.ConeGeometry(0.35, 2.2, 4, 1);
    geo.rotateZ(-Math.PI / 2);
    geo.translate(1.1, 0, 0);
    geo.scale(1, 0.25, 1);
    const leaf = part(geo, flatMat(rng.pick(PALETTE.palmLeaves)));
    leaf.rotation.z = -rng.range(0.35, 0.6);
    frond.add(leaf);
    top.add(frond);
  }

  g.scale.setScalar(scale);
  g.rotation.y = rng() * Math.PI * 2;
  swayable(g, 1.4, 5 * scale);
  return { object: g, radius: 0.35 * scale };
}
