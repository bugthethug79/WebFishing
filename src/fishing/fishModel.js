// Procedural low-poly fish, oriented along +X (head) with the tail toward -X.
// Each species picks a body `shape`; colours come from its data entry.

import * as THREE from 'three';
import { flatMat, part } from '../world/props/materials.js';

// Body scale (relative to a 0.3 radius sphere) for each archetype.
const BODY = {
  standard: [1.6, 0.85, 0.55],
  round: [1.15, 1.0, 1.0],
  tall: [1.1, 1.5, 0.35],
  flat: [1.5, 1.05, 0.28],
  long: [3.4, 0.5, 0.45],
  ray: [1.0, 0.22, 1.7],
  sword: [1.7, 0.8, 0.55],
  angler: [1.25, 1.05, 0.95],
  slim: [2.4, 0.6, 0.5],
  catfish: [1.8, 0.72, 0.7],
};

// Big species would be enormous at true scale; tone them down for display.
const DISPLAY = { long: 0.55, ray: 0.6, sword: 0.6, slim: 0.65, catfish: 0.85 };

const vertexColorMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.6 });
// Ghostly species glow softly and are a little see-through.
const glowMat = new THREE.MeshStandardMaterial({
  vertexColors: true,
  flatShading: true,
  emissive: 0xbfe6ff,
  emissiveIntensity: 0.6,
  transparent: true,
  opacity: 0.85,
});

export function createFishModel(species, sizeCm) {
  const g = new THREE.Group();
  const shape = species.shape;
  const [sx, sy, sz] = BODY[shape];
  const halfLen = 0.3 * sx;
  const halfH = 0.3 * sy;

  g.add(part(createBody(species, sx, sy, sz), species.glow ? glowMat : vertexColorMat));

  const finMat = flatMat(species.fin);
  const thinCone = (r, h, sides = 4) => new THREE.ConeGeometry(r, h, sides);

  // Tail.
  const tailSize = shape === 'long' ? 0.12 : shape === 'ray' ? 0.03 : 0.22;
  const tailGeo = thinCone(tailSize, shape === 'ray' ? 0.75 : 0.32);
  tailGeo.rotateZ(Math.PI / 2);
  tailGeo.scale(1, 1, 0.25);
  const tailLen = shape === 'ray' ? 0.38 : 0.16;
  const tail = part(tailGeo, finMat, -halfLen - tailLen + 0.04, 0, 0);
  g.add(tail);

  // Dorsal (and for some shapes ventral) fins.
  if (shape === 'tall') {
    for (const dir of [1, -1]) {
      const fin = thinCone(0.14, 0.5, 3);
      fin.scale(1.3, 1, 0.25);
      if (dir < 0) fin.rotateZ(Math.PI);
      const f = part(fin, finMat, -0.12, dir * (halfH + 0.12), 0);
      f.rotation.z = 0.5 * dir;
      g.add(f);
    }
  } else if (shape === 'long' || shape === 'flat') {
    // A fringe running along the back (and belly for flatfish).
    const ridge = new THREE.BoxGeometry(halfLen * 1.5, 0.08, 0.04);
    g.add(part(ridge, finMat, -0.05, halfH * 0.85, 0));
    if (shape === 'flat') g.add(part(ridge.clone(), finMat, -0.05, -halfH * 0.85, 0));
  } else if (shape === 'ray') {
    // Rays don't get a dorsal fin.
  } else {
    const fin = thinCone(0.12, 0.25, 3);
    fin.scale(1.4, 1, 0.3);
    g.add(part(fin, finMat, -0.05, halfH + 0.03, 0));
  }

  // Little side fins.
  if (shape !== 'ray' && shape !== 'long') {
    for (const side of [-1, 1]) {
      const pec = thinCone(0.06, 0.16, 3);
      pec.rotateX((side * Math.PI) / 2);
      const p = part(pec, finMat, halfLen * 0.2, -halfH * 0.3, side * 0.3 * sz);
      p.rotation.y = side * 0.6;
      g.add(p);
    }
  }

  // Shape extras.
  if (shape === 'round') {
    // Puffer spikes.
    const spikeMat = flatMat(species.fin);
    const ico = new THREE.IcosahedronGeometry(1, 0).attributes.position;
    for (let i = 0; i < ico.count; i += 3) {
      const n = new THREE.Vector3(ico.getX(i), ico.getY(i), ico.getZ(i)).normalize();
      const spike = part(thinCone(0.025, 0.1, 3), spikeMat);
      spike.position.set(n.x * 0.3 * sx, n.y * 0.3 * sy, n.z * 0.3 * sz);
      spike.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
      g.add(spike);
    }
  }
  if (shape === 'catfish') {
    // Whiskers.
    for (const side of [-1, 1]) {
      for (const tilt of [0.25, -0.35]) {
        const w = part(new THREE.CylinderGeometry(0.008, 0.012, 0.42, 3), flatMat(species.fin));
        w.position.set(halfLen + 0.05, -0.02, side * 0.12);
        w.rotation.set(side * 0.6, 0, Math.PI / 2 + tilt);
        w.translateY(0.18);
        g.add(w);
      }
    }
  }
  if (shape === 'sword') {
    const bill = thinCone(0.035, 0.7, 4);
    bill.rotateZ(-Math.PI / 2);
    g.add(part(bill, flatMat(0x2a3550), halfLen + 0.3, 0.02, 0));
  }
  if (shape === 'angler') {
    const stalk = new THREE.CylinderGeometry(0.012, 0.015, 0.4, 4);
    const s = part(stalk, flatMat(species.fin), halfLen * 0.4, halfH + 0.15, 0);
    s.rotation.z = -0.6;
    g.add(s);
    const lure = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.06, 0),
      new THREE.MeshStandardMaterial({ color: 0xfff27a, emissive: 0xffd84d, emissiveIntensity: 1.5, flatShading: true }),
    );
    lure.position.set(halfLen * 0.4 + 0.2, halfH + 0.3, 0);
    g.add(lure);
    // Toothy grin.
    for (let i = 0; i < 4; i++) {
      const tooth = part(thinCone(0.02, 0.07, 3), flatMat(0xffffff));
      tooth.position.set(halfLen * 0.92, -0.04, (i - 1.5) * 0.06);
      tooth.rotation.z = Math.PI;
      g.add(tooth);
    }
  }

  // Eyes.
  const eyeX = shape === 'ray' ? halfLen * 0.55 : shape === 'long' ? halfLen * 0.85 : halfLen * 0.68;
  const eyeY = shape === 'ray' ? halfH * 0.8 : halfH * 0.25;
  const eyeZ = shape === 'ray' ? 0.18 : 0.3 * sz * 0.8;
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 4), flatMat(0x1e1e28));
    eye.position.set(eyeX, eyeY, side * eyeZ);
    g.add(eye);
  }

  g.scale.setScalar((0.6 + Math.min(1.6, sizeCm / 60)) * (DISPLAY[shape] ?? 1));
  return { object: g, tail };
}

// Faceted body with per-face colours: darker back, light belly, optional stripes.
function createBody(species, sx, sy, sz) {
  const geo = new THREE.IcosahedronGeometry(0.3, 1);
  geo.scale(sx, sy, sz);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);

  const top = new THREE.Color(species.color);
  const belly = new THREE.Color(species.belly ?? species.color);
  const stripe = species.stripe ? new THREE.Color(species.stripe) : null;
  const halfLen = 0.3 * sx;
  const halfH = 0.3 * sy;
  const c = new THREE.Color();

  for (let i = 0; i < pos.count; i += 3) {
    const cx = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3;
    const cy = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
    // Rays: top/bottom split; everyone else: back/belly gradient.
    const ny = cy / halfH;
    c.copy(top).lerp(belly, THREE.MathUtils.smoothstep(-ny, -0.1, 0.6));

    if (stripe && species.stripes) {
      const nx = (halfLen - cx) / (halfLen * 2); // 0 at head, 1 at tail
      for (let s = 0; s < species.stripes; s++) {
        const center = 0.22 + (s / Math.max(1, species.stripes - 1)) * 0.5;
        if (Math.abs(nx - center) < 0.06) c.copy(stripe);
      }
    }
    for (let k = 0; k < 3; k++) c.toArray(colors, (i + k) * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}
