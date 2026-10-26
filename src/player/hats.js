// Hat builders, in head-local space (the head sphere is centred at y = 0.3, radius 0.36).

import * as THREE from 'three';
import { flatMat, part } from '../world/props/materials.js';
import { createFishModel } from '../fishing/fishModel.js';
import { FISH_BY_ID } from '../collection/fishData.js';

const cyl = (rTop, rBottom, h, sides = 8) => new THREE.CylinderGeometry(rTop, rBottom, h, sides);

const BUILDERS = {
  bucket(g) {
    g.add(part(cyl(0.3, 0.36, 0.26), flatMat(0xffcc3d), 0, 0.6, 0));
    g.add(part(cyl(0.37, 0.37, 0.05), flatMat(0xe0a21f), 0, 0.5, 0));
    g.add(part(cyl(0.55, 0.58, 0.05, 10), flatMat(0xffcc3d), 0, 0.47, 0));
  },
  straw(g) {
    const straw = flatMat(0xf2d38a);
    g.add(part(cyl(0.72, 0.74, 0.04, 12), straw, 0, 0.5, 0));
    g.add(part(cyl(0.28, 0.34, 0.24, 10), straw, 0, 0.62, 0));
    g.add(part(cyl(0.345, 0.345, 0.07, 10), flatMat(0xff5a6e), 0, 0.54, 0));
  },
  beanie(g) {
    const knit = flatMat(0x5fb3e8);
    const dome = new THREE.SphereGeometry(0.39, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    g.add(part(dome, knit, 0, 0.4, 0));
    g.add(part(cyl(0.4, 0.4, 0.12, 10), flatMat(0x3f8fc9), 0, 0.42, 0));
    g.add(part(new THREE.IcosahedronGeometry(0.1, 0), flatMat(0xffffff), 0, 0.82, 0));
  },
  captain(g) {
    g.add(part(cyl(0.38, 0.35, 0.22, 10), flatMat(0xffffff), 0, 0.62, 0));
    g.add(part(cyl(0.36, 0.36, 0.07, 10), flatMat(0x23345e), 0, 0.53, 0));
    const visor = part(new THREE.BoxGeometry(0.42, 0.04, 0.22), flatMat(0x1e1e28), 0, 0.5, 0.36);
    visor.rotation.x = 0.25;
    g.add(visor);
    g.add(part(new THREE.IcosahedronGeometry(0.06, 0), flatMat(0xffd84d), 0, 0.6, 0.36));
  },
  fishhat(g) {
    const { object } = createFishModel(FISH_BY_ID.clownfish, 30);
    object.scale.setScalar(0.95);
    object.rotation.y = -Math.PI / 2; // head pointing forward
    object.position.set(0, 0.78, -0.05);
    g.add(object);
  },
  crown(g) {
    const gold = flatMat(0xffc93d, { metalness: 0.4, roughness: 0.4 });
    g.add(part(cyl(0.32, 0.3, 0.14, 10), gold, 0, 0.58, 0));
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      g.add(part(new THREE.ConeGeometry(0.07, 0.18, 4), gold, Math.sin(a) * 0.28, 0.73, Math.cos(a) * 0.28));
      const gem = part(new THREE.OctahedronGeometry(0.04), flatMat(i % 2 ? 0xff4b6e : 0x4fb3ff), Math.sin(a) * 0.31, 0.58, Math.cos(a) * 0.31);
      g.add(gem);
    }
  },
};

export function buildHat(id) {
  const g = new THREE.Group();
  (BUILDERS[id] ?? BUILDERS.bucket)(g);
  return g;
}
