// Falling rain streaks around the camera plus ripples where drops hit the water.

import * as THREE from 'three';
import { Effects } from '../fishing/Effects.js';

const COUNT = 1400;
const AREA = 46;
const HEIGHT = 26;
const SPEED = 24;

export class Rain {
  constructor(scene) {
    this.positions = new Float32Array(COUNT * 6);
    this.drops = Array.from({ length: COUNT }, () => ({
      x: (Math.random() - 0.5) * AREA,
      y: Math.random() * HEIGHT,
      z: (Math.random() - 0.5) * AREA,
    }));
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.material = new THREE.LineBasicMaterial({ color: 0xdfefff, transparent: true, opacity: 0, depthWrite: false });
    this.lines = new THREE.LineSegments(geo, this.material);
    this.lines.frustumCulled = false;
    this.lines.visible = false;
    scene.add(this.lines);
    this.effects = new Effects(scene);
    this.rippleTimer = 0;
  }

  // amount: 0..1. center: camera target. isWater(x, z) -> bool.
  update(dt, amount, center, isWater) {
    this.effects.update(dt);
    this.lines.visible = amount > 0.02;
    if (!this.lines.visible) return;
    this.material.opacity = 0.45 * amount;

    const p = this.positions;
    const half = AREA / 2;
    this.drops.forEach((d, i) => {
      d.y -= SPEED * dt;
      if (d.y < 0) {
        d.y += HEIGHT;
        d.x = (Math.random() - 0.5) * AREA;
        d.z = (Math.random() - 0.5) * AREA;
      }
      const x = center.x + d.x;
      const z = center.z + d.z;
      p[i * 6] = x;
      p[i * 6 + 1] = d.y;
      p[i * 6 + 2] = z;
      p[i * 6 + 3] = x + 0.08; // slight wind slant
      p[i * 6 + 4] = d.y + 0.7;
      p[i * 6 + 5] = z;
    });
    this.lines.geometry.attributes.position.needsUpdate = true;

    // Little rings popping on the water near the camera.
    this.rippleTimer -= dt;
    while (this.rippleTimer < 0) {
      this.rippleTimer += 1 / (70 * amount);
      const x = center.x + (Math.random() - 0.5) * half * 1.4;
      const z = center.z + (Math.random() - 0.5) * half * 1.4;
      if (isWater(x, z)) this.effects.ripple(x, z, 0.2, 0.45);
    }
  }
}
