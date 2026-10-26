// Dark fish silhouettes drifting under the water. Cast near one and it swims to
// your bobber (and bites sooner); once hooked it vanishes and respawns elsewhere.

import * as THREE from 'three';

const bodyGeo = new THREE.CircleGeometry(0.5, 12).rotateX(-Math.PI / 2);
const tailGeo = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(-0.45, 0, 0.28),
  new THREE.Vector3(-0.45, 0, -0.28),
]);

export class FishShadows {
  constructor(world, count) {
    this.world = world;
    this.rng = world.rng;
    this.shadows = [];
    for (let i = 0; i < count; i++) {
      const material = new THREE.MeshBasicMaterial({ color: 0x0b2a38, transparent: true, opacity: 0, depthWrite: false });
      const group = new THREE.Group();
      const body = new THREE.Mesh(bodyGeo, material);
      body.scale.set(1.5, 1, 0.55);
      const tail = new THREE.Mesh(tailGeo, material);
      tail.position.x = -0.6;
      group.add(body, tail);
      const s = { group, tail, material, size: 0.7 + this.rng() * 0.8, alpha: 0, attract: null, gone: 0 };
      group.scale.setScalar(s.size);
      world.root.add(group);
      this.respawn(s);
      this.shadows.push(s);
    }
  }

  isDeepEnough(x, z) {
    return this.world.island.groundHeight(x, z) < -0.7 && !this.world.isOnDock(x, z);
  }

  randomSpot() {
    const island = this.world.island;
    for (let i = 0; i < 30; i++) {
      const p = island.shorePoint(this.rng() * Math.PI * 2, -1.5 - this.rng() * 11);
      if (this.isDeepEnough(p.x, p.z)) return p;
    }
    return island.shorePoint(0, -6);
  }

  respawn(s) {
    const p = this.randomSpot();
    s.x = p.x;
    s.z = p.z;
    s.heading = this.rng() * Math.PI * 2;
    s.speed = 0.5 + this.rng() * 0.6;
    s.alpha = 0;
    s.attract = null;
    this.pickTarget(s);
  }

  pickTarget(s) {
    // Wander a few units at a time.
    for (let i = 0; i < 10; i++) {
      const a = this.rng() * Math.PI * 2;
      const r = 2 + this.rng() * 4;
      const tx = s.x + Math.cos(a) * r;
      const tz = s.z + Math.sin(a) * r;
      if (this.isDeepEnough(tx, tz)) {
        s.tx = tx;
        s.tz = tz;
        return;
      }
    }
    s.tx = s.x;
    s.tz = s.z;
  }

  nearest(x, z, maxDist) {
    let best = null;
    let bestD = maxDist;
    for (const s of this.shadows) {
      if (s.gone > 0 || s.attract) continue;
      const d = Math.hypot(s.x - x, s.z - z);
      if (d < bestD) {
        best = s;
        bestD = d;
      }
    }
    return best;
  }

  attract(s, x, z) {
    s.attract = { x, z };
  }

  release(s) {
    if (s) s.attract = null;
  }

  // The fish took the bait: fade this shadow out, bring it back elsewhere later.
  hook(s) {
    if (!s) return;
    s.gone = 6 + this.rng() * 6;
    s.attract = null;
  }

  update(dt, time, night) {
    const maxAlpha = 0.32 * (1 - night * 0.6);
    for (const s of this.shadows) {
      if (s.gone > 0) {
        s.alpha = Math.max(0, s.alpha - dt * 2);
        s.gone -= dt;
        if (s.gone <= 0) this.respawn(s);
      } else {
        s.alpha = Math.min(maxAlpha, s.alpha + dt * 0.3);
        const tx = s.attract ? s.attract.x : s.tx;
        const tz = s.attract ? s.attract.z : s.tz;
        const dx = tx - s.x;
        const dz = tz - s.z;
        const d = Math.hypot(dx, dz);
        const stopAt = s.attract ? 0.7 : 0.3;
        if (d > stopAt) {
          const want = Math.atan2(dz, dx);
          let diff = want - s.heading;
          diff = Math.atan2(Math.sin(diff), Math.cos(diff));
          s.heading += diff * Math.min(1, dt * 2.5);
          const v = s.speed * (s.attract ? 1.6 : 1) * Math.min(1, d);
          s.x += Math.cos(s.heading) * v * dt;
          s.z += Math.sin(s.heading) * v * dt;
        } else if (!s.attract) {
          this.pickTarget(s);
        }
      }
      s.material.opacity = s.alpha;
      s.group.visible = s.alpha > 0.01;
      s.group.position.set(s.x, -0.3, s.z);
      s.group.rotation.y = -s.heading;
      s.tail.rotation.y = Math.sin(time * 6 + s.size * 10) * 0.35;
    }
  }
}
