// Small pooled particle system for puffs (dust) and sparkles.
// Each particle is a tiny mesh; a few hundred is plenty for this game.

import * as THREE from 'three';

const SHAPES = {
  puff: new THREE.IcosahedronGeometry(1, 0),
  spark: new THREE.OctahedronGeometry(1, 0),
};

export class Particles {
  constructor(scene, max = 240) {
    this.scene = scene;
    this.max = max;
    this.pool = [];
  }

  // opts: count, color, speed (outward), up (initial upward), life (s), size, gravity, grow, spin, shape
  emit(x, y, z, opts = {}) {
    const {
      count = 6,
      color = 0xffffff,
      speed = 1,
      up = 1,
      life = 0.6,
      size = 0.12,
      gravity = -2,
      grow = 1.5,
      spin = 0,
      shape = 'puff',
      spread = 0.2,
    } = opts;
    for (let i = 0; i < count; i++) {
      const p = this.acquire(shape);
      if (!p) return;
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.5 + Math.random() * 0.5);
      p.mesh.position.set(x + Math.cos(a) * spread * Math.random(), y, z + Math.sin(a) * spread * Math.random());
      p.vel.set(Math.cos(a) * s, up * (0.6 + Math.random() * 0.6), Math.sin(a) * s);
      p.mesh.material.color.set(color);
      Object.assign(p, { age: 0, life: life * (0.7 + Math.random() * 0.6), size, gravity, grow, spin });
      p.mesh.scale.setScalar(size);
      p.mesh.visible = true;
      p.active = true;
    }
  }

  acquire(shape) {
    let p = this.pool.find((q) => !q.active && q.shape === shape);
    if (!p) {
      if (this.pool.length >= this.max) return null;
      const mesh = new THREE.Mesh(
        SHAPES[shape],
        new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }),
      );
      mesh.renderOrder = 5;
      this.scene.add(mesh);
      p = { mesh, shape, vel: new THREE.Vector3() };
      this.pool.push(p);
    }
    return p;
  }

  update(dt) {
    for (const p of this.pool) {
      if (!p.active) continue;
      p.age += dt;
      const t = p.age / p.life;
      if (t >= 1) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }
      p.vel.y += p.gravity * dt;
      p.vel.multiplyScalar(1 - dt * 2); // a little air drag
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.scale.setScalar(p.size * (1 + (p.grow - 1) * t) * (t > 0.7 ? (1 - t) / 0.3 : 1));
      p.mesh.material.opacity = 1 - t * t;
      if (p.spin) p.mesh.rotation.y += p.spin * dt;
    }
  }
}
