// Pooled water ripples and splash droplets.

import * as THREE from 'three';
import { WORLD } from '../config.js';

const rippleGeo = new THREE.RingGeometry(0.85, 1, 28).rotateX(-Math.PI / 2);
const dropGeo = new THREE.IcosahedronGeometry(0.06, 0);

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.ripples = [];
    this.drops = [];
    this.dropMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  }

  ripple(x, z, size = 1, duration = 1.2) {
    let r = this.ripples.find((e) => !e.active);
    if (!r) {
      const mesh = new THREE.Mesh(
        rippleGeo,
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false }),
      );
      mesh.renderOrder = 3;
      this.scene.add(mesh);
      r = { mesh };
      this.ripples.push(r);
    }
    Object.assign(r, { active: true, age: 0, duration, size });
    r.mesh.visible = true;
    // Start small right away, or it renders one frame at full size before update() runs.
    r.mesh.scale.setScalar(size * 0.2);
    r.mesh.material.opacity = 0.8;
    r.mesh.position.set(x, WORLD.waterLevel + 0.06, z);
  }

  splash(x, y, z, count = 10, power = 1) {
    for (let i = 0; i < count; i++) {
      let d = this.drops.find((e) => !e.active);
      if (!d) {
        const mesh = new THREE.Mesh(dropGeo, this.dropMat);
        this.scene.add(mesh);
        d = { mesh, vel: new THREE.Vector3() };
        this.drops.push(d);
      }
      const a = Math.random() * Math.PI * 2;
      const s = (0.8 + Math.random() * 1.6) * power;
      d.vel.set(Math.cos(a) * s, (2.5 + Math.random() * 2.5) * power, Math.sin(a) * s);
      d.mesh.position.set(x, y, z);
      d.mesh.visible = true;
      d.active = true;
    }
  }

  update(dt) {
    for (const r of this.ripples) {
      if (!r.active) continue;
      r.age += dt;
      const t = r.age / r.duration;
      if (t >= 1) {
        r.active = false;
        r.mesh.visible = false;
        continue;
      }
      r.mesh.scale.setScalar(r.size * (0.2 + t * 1.3));
      r.mesh.material.opacity = 0.8 * (1 - t);
    }
    for (const d of this.drops) {
      if (!d.active) continue;
      d.vel.y -= 14 * dt;
      d.mesh.position.addScaledVector(d.vel, dt);
      if (d.mesh.position.y < WORLD.waterLevel) {
        d.active = false;
        d.mesh.visible = false;
      }
    }
  }
}
