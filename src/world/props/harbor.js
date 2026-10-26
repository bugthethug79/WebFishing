// Lamp posts and rowboats, shared by every zone with a dock.

import * as THREE from 'three';
import { flatMat, part } from './materials.js';

// Lamp post whose bulb and light are switched on by the world at night.
export function createLampPost() {
  const g = new THREE.Group();
  const green = flatMat(0x2f7a5a);
  g.add(part(new THREE.CylinderGeometry(0.08, 0.12, 2.6, 6), green, 0, 1.3, 0));
  g.add(part(new THREE.CylinderGeometry(0.2, 0.25, 0.15, 6), green, 0, 0.08, 0));
  g.add(part(new THREE.ConeGeometry(0.32, 0.25, 6), green, 0, 2.95, 0));
  const bulbMaterial = new THREE.MeshStandardMaterial({ color: 0xfff1c4, emissive: 0xffd27a, emissiveIntensity: 0, flatShading: true });
  const bulb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.17, 0), bulbMaterial);
  bulb.position.y = 2.7;
  g.add(bulb);
  const light = new THREE.PointLight(0xffd9a0, 0, 14, 1.5);
  light.position.y = 2.6;
  g.add(light);
  return { object: g, light, bulbMaterial };
}

// Little rowboat: a tapered half-cylinder hull with a seat and oars.
export function createRowboat(color = 0xe0564f) {
  const g = new THREE.Group();
  const length = 2.8;
  // The half of the cylinder that ends up below the axis after rotating, so the hull opens upward.
  const hullGeo = new THREE.CylinderGeometry(0.62, 0.62, length, 10, 6, false, Math.PI, Math.PI);
  hullGeo.rotateZ(Math.PI / 2); // axis along X, opening upward
  const pos = hullGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const t = pos.getX(i) / (length / 2); // -1..1 along the boat
    const taper = 1 - t * t * 0.75;
    pos.setY(i, pos.getY(i) * (0.55 + taper * 0.25));
    pos.setZ(i, pos.getZ(i) * taper);
  }
  hullGeo.computeVertexNormals();
  const hull = part(hullGeo, flatMat(color, { side: THREE.DoubleSide }));
  g.add(hull);
  g.add(part(new THREE.BoxGeometry(0.35, 0.06, 1.0), flatMat(0xb5733f), 0.1, -0.1, 0));
  for (const side of [-1, 1]) {
    const oar = part(new THREE.CylinderGeometry(0.03, 0.03, 1.8, 4), flatMat(0xc98d5a), -0.1, 0.0, side * 0.45);
    oar.rotation.set(side * 0.3, 0, Math.PI / 2 - 0.25);
    g.add(oar);
  }
  return g;
}
