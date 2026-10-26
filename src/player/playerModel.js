// Chibi low-poly fisher built from primitives: big head, bucket hat, striped shirt.
// Returns the group plus named joints the animator can swing.

import * as THREE from 'three';
import { flatMat, part } from '../world/props/materials.js';

const COLORS = {
  skin: 0xf2b48a,
  hat: 0xffcc3d,
  hatBand: 0xe0a21f,
  shirt: 0xffffff,
  stripe: 0x3a4a78,
  jacket: 0xff9a3c,
  pants: 0x3f66b8,
  shoes: 0x5a3b2a,
  eyes: 0x2a2a35,
};

export function createPlayerModel() {
  const root = new THREE.Group();
  const body = new THREE.Group(); // bobs while walking
  root.add(body);

  // Legs pivot at the hip.
  const legs = [];
  for (const side of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(side * 0.16, 0.55, 0);
    hip.add(part(new THREE.CylinderGeometry(0.11, 0.1, 0.45, 6), flatMat(COLORS.pants), 0, -0.22, 0));
    hip.add(part(new THREE.BoxGeometry(0.22, 0.14, 0.32), flatMat(COLORS.shoes), 0, -0.47, 0.05));
    body.add(hip);
    legs.push(hip);
  }

  // Torso: striped shirt under an open jacket.
  const torso = new THREE.Group();
  torso.position.y = 0.55;
  body.add(torso);
  const stripes = 4;
  for (let i = 0; i < stripes; i++) {
    const h = 0.55 / stripes;
    torso.add(
      part(
        new THREE.CylinderGeometry(0.27 - i * 0.012, 0.29 - i * 0.012, h, 8),
        flatMat(i % 2 ? COLORS.stripe : COLORS.shirt),
        0,
        h / 2 + i * h,
        0,
      ),
    );
  }
  // Jacket panels on the sides and back.
  for (const side of [-1, 1]) {
    const panel = part(new THREE.BoxGeometry(0.16, 0.56, 0.5), flatMat(COLORS.jacket), side * 0.2, 0.28, -0.04);
    torso.add(panel);
  }

  // Arms pivot at the shoulder.
  const arms = [];
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.36, 0.5, 0);
    shoulder.add(part(new THREE.CylinderGeometry(0.08, 0.075, 0.42, 6), flatMat(COLORS.jacket), 0, -0.2, 0));
    shoulder.add(part(new THREE.IcosahedronGeometry(0.085, 0), flatMat(COLORS.skin), 0, -0.44, 0));
    shoulder.rotation.z = side * 0.12;
    torso.add(shoulder);
    arms.push(shoulder);
  }

  // Head with simple face.
  const head = new THREE.Group();
  head.position.y = 0.62;
  torso.add(head);
  head.add(part(new THREE.IcosahedronGeometry(0.36, 1), flatMat(COLORS.skin), 0, 0.3, 0));
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 4), flatMat(COLORS.eyes));
    eye.position.set(side * 0.13, 0.33, 0.32);
    eye.scale.set(1, 1.4, 0.6);
    head.add(eye);
  }
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 3, 8, Math.PI), flatMat(0x9b4a3a));
  mouth.position.set(0, 0.2, 0.33);
  mouth.rotation.z = Math.PI;
  head.add(mouth);

  // Bucket hat.
  head.add(part(new THREE.CylinderGeometry(0.3, 0.36, 0.26, 8), flatMat(COLORS.hat), 0, 0.6, 0));
  head.add(part(new THREE.CylinderGeometry(0.37, 0.37, 0.05, 8), flatMat(COLORS.hatBand), 0, 0.5, 0));
  head.add(part(new THREE.CylinderGeometry(0.55, 0.58, 0.05, 10), flatMat(COLORS.hat), 0, 0.47, 0));

  return { root, body, torso, head, legs, arms };
}
