// Pine Lake props: pines, mushrooms, campfire, tent, log seats.

import * as THREE from 'three';
import { flatMat, part, jitter } from './materials.js';

const PINE_GREENS = [0x2f8f5a, 0x3a9e60, 0x267a4c, 0x45a866];

export function createPine(rng, scale = 1) {
  const g = new THREE.Group();
  g.add(part(new THREE.CylinderGeometry(0.14, 0.22, 1.2, 6), flatMat(0x7a4f32), 0, 0.6, 0));
  const leaf = flatMat(rng.pick(PINE_GREENS));
  const tiers = 3 + Math.floor(rng() * 2);
  for (let i = 0; i < tiers; i++) {
    const r = 1.15 - i * (0.75 / tiers);
    const geo = jitter(new THREE.ConeGeometry(r, 1.3, 7), 0.08, rng);
    g.add(part(geo, leaf, 0, 1.3 + i * 0.75, 0));
  }
  g.scale.setScalar(scale);
  g.rotation.y = rng() * Math.PI * 2;
  return { object: g, radius: 0.35 * scale };
}

export function createMushroom(rng) {
  const g = new THREE.Group();
  const s = rng.range(0.7, 1.3);
  g.add(part(new THREE.CylinderGeometry(0.05, 0.06, 0.2, 5), flatMat(0xf4ecd8), 0, 0.1, 0));
  const cap = new THREE.SphereGeometry(0.13, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2);
  g.add(part(cap, flatMat(rng() > 0.3 ? 0xe0463f : 0xc98a52), 0, 0.18, 0));
  g.scale.setScalar(s);
  return g;
}

export function createLogSeat(length = 1.6) {
  const g = new THREE.Group();
  const log = part(new THREE.CylinderGeometry(0.22, 0.24, length, 7), flatMat(0x8a5a3b), 0, 0.22, 0);
  log.rotation.z = Math.PI / 2;
  g.add(log);
  for (const side of [-1, 1]) {
    const ring = part(new THREE.CircleGeometry(0.22, 7), flatMat(0xd9b07a), side * (length / 2 + 0.005), 0.22, 0);
    ring.rotation.y = (side * Math.PI) / 2;
    g.add(ring);
  }
  return g;
}

export function createTent() {
  const g = new THREE.Group();
  const w = 2.2;
  const h = 1.5;
  const depth = 2.4;
  // A triangular prism: the A-frame profile extruded front to back.
  const profile = new THREE.Shape().moveTo(-w / 2, 0).lineTo(w / 2, 0).lineTo(0, h).closePath();
  const body = new THREE.ExtrudeGeometry(profile, { depth, bevelEnabled: false });
  body.translate(0, 0, -depth / 2);
  g.add(part(body, flatMat(0xff8a3d)));
  // Ridge pole and a dark doorway on the front face.
  g.add(part(new THREE.BoxGeometry(0.08, 0.08, depth + 0.3), flatMat(0x6b4128), 0, h, 0));
  const door = new THREE.Shape().moveTo(-0.42, 0).lineTo(0.42, 0).lineTo(0, 1.0).closePath();
  g.add(part(new THREE.ShapeGeometry(door), flatMat(0x5a3322), 0, 0.01, depth / 2 + 0.01));
  return { object: g, halfW: w / 2, halfD: depth / 2 };
}

// Stones, crossed logs and flickering flames. update(time) animates it.
export function createCampfire() {
  const g = new THREE.Group();
  const stone = flatMat(0x9aa5ab);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.add(part(new THREE.DodecahedronGeometry(0.16, 0), stone, Math.cos(a) * 0.5, 0.08, Math.sin(a) * 0.5));
  }
  for (let i = 0; i < 3; i++) {
    const log = part(new THREE.CylinderGeometry(0.07, 0.08, 0.8, 5), flatMat(0x6b4128), 0, 0.12, 0);
    log.rotation.set(Math.PI / 2 - 0.25, (i / 3) * Math.PI, 0);
    g.add(log);
  }
  const flameMats = [0xffd84d, 0xff8a2b, 0xff5a2b].map(
    (c) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.6, flatShading: true }),
  );
  const flames = [];
  for (let i = 0; i < 3; i++) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.22 - i * 0.05, 0.7 - i * 0.12, 5), flameMats[i]);
    f.position.set((i - 1) * 0.08, 0.4, (i % 2) * 0.06);
    g.add(f);
    flames.push(f);
  }
  const light = new THREE.PointLight(0xff9a4a, 6, 12, 1.6);
  light.position.y = 0.8;
  g.add(light);

  return {
    object: g,
    light,
    update(time) {
      flames.forEach((f, i) => {
        const s = 1 + Math.sin(time * (9 + i * 3) + i) * 0.12 + Math.sin(time * 23 + i) * 0.05;
        f.scale.set(1, s, 1);
        f.rotation.y = time * (1 + i);
      });
      light.userData.flicker = 0.85 + Math.sin(time * 11) * 0.08 + Math.sin(time * 27) * 0.07;
    },
  };
}

// Soft glowing dots drifting over the shore, visible at night.
export function createFireflies(island, rng, count = 70) {
  const positions = new Float32Array(count * 3);
  const seeds = [];
  for (let i = 0; i < count; i++) {
    const p = island.shorePoint(rng() * Math.PI * 2, rng.range(0.5, 12));
    seeds.push({ x: p.x, z: p.z, y: rng.range(0.4, 2.2), phase: rng() * 10, speed: rng.range(0.3, 0.8) });
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 32;
  const c = canvas.getContext('2d');
  const grad = c.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,255,200,1)');
  grad.addColorStop(0.3, 'rgba(230,255,120,0.8)');
  grad.addColorStop(1, 'rgba(200,255,80,0)');
  c.fillStyle = grad;
  c.fillRect(0, 0, 32, 32);

  const material = new THREE.PointsMaterial({
    size: 0.5,
    map: new THREE.CanvasTexture(canvas),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: 0,
  });
  const points = new THREE.Points(geo, material);
  points.frustumCulled = false;

  return {
    object: points,
    update(time, night) {
      material.opacity = night;
      points.visible = night > 0.02;
      if (!points.visible) return;
      seeds.forEach((s, i) => {
        const t = time * s.speed + s.phase;
        positions[i * 3] = s.x + Math.sin(t) * 0.8;
        positions[i * 3 + 1] = s.y + Math.sin(t * 1.7) * 0.3;
        positions[i * 3 + 2] = s.z + Math.cos(t * 0.8) * 0.8;
      });
      geo.attributes.position.needsUpdate = true;
    },
  };
}
