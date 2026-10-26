// Little shore creatures: crabs that scuttle sideways and frogs that hop.
// Both wander along the shoreline and run (or dive) away when the player comes close.

import * as THREE from 'three';
import { flatMat, part } from '../props/materials.js';

function crabModel() {
  const g = new THREE.Group();
  const red = flatMat(0xe0563f);
  const body = part(new THREE.DodecahedronGeometry(0.2, 0), red, 0, 0.14, 0);
  body.scale.set(1.3, 0.55, 1);
  g.add(body);
  for (const side of [-1, 1]) {
    g.add(part(new THREE.CylinderGeometry(0.015, 0.015, 0.14, 3), red, side * 0.07, 0.25, 0.12));
    g.add(part(new THREE.SphereGeometry(0.035, 5, 3), flatMat(0x1e1e28), side * 0.07, 0.33, 0.12));
    const claw = part(new THREE.IcosahedronGeometry(0.08, 0), red, side * 0.27, 0.15, 0.15);
    claw.scale.set(1, 0.7, 1.3);
    g.add(claw);
  }
  const legs = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const leg = part(new THREE.CylinderGeometry(0.015, 0.012, 0.22, 3), red, side * 0.24, 0.08, -0.08 + i * 0.08);
      leg.rotation.z = side * 1.1;
      g.add(leg);
      legs.push(leg);
    }
  }
  return { object: g, legs };
}

function frogModel() {
  const g = new THREE.Group();
  const green = flatMat(0x5fbf4a);
  const body = part(new THREE.IcosahedronGeometry(0.18, 1), green, 0, 0.14, 0);
  body.scale.set(1, 0.7, 1.2);
  g.add(body);
  for (const side of [-1, 1]) {
    g.add(part(new THREE.IcosahedronGeometry(0.06, 0), green, side * 0.09, 0.26, 0.12));
    g.add(part(new THREE.SphereGeometry(0.03, 5, 3), flatMat(0x1e1e28), side * 0.1, 0.28, 0.16));
    const leg = part(new THREE.IcosahedronGeometry(0.08, 0), flatMat(0x4fa83c), side * 0.15, 0.06, -0.1);
    leg.scale.set(0.7, 0.6, 1.4);
    g.add(leg);
  }
  g.add(part(new THREE.IcosahedronGeometry(0.1, 0), flatMat(0xe6f2b0), 0, 0.09, 0.05)); // pale belly
  return { object: g, legs: [] };
}

const KINDS = {
  crab: { model: crabModel, band: [0.4, 3.2], speed: 1.4, fleeSpeed: 3.5, fleeRadius: 3, hops: false },
  frog: { model: frogModel, band: [0.3, 2.6], speed: 1.1, fleeSpeed: 3, fleeRadius: 2.6, hops: true },
};

export class Critters {
  // effects: optional { ripple(x, z, size) } for frogs diving in.
  constructor(world, kind, count) {
    this.world = world;
    this.kind = KINDS[kind];
    this.kindName = kind;
    this.rng = world.rng;
    this.list = [];
    for (let i = 0; i < count; i++) {
      const m = this.kind.model();
      world.root.add(m.object);
      const c = { ...m, state: 'idle', timer: this.rng() * 2, hop: 0, hidden: 0 };
      this.place(c);
      this.list.push(c);
    }
  }

  inBand(x, z) {
    const d = this.world.island.inlandDistance(x, z);
    return d > this.kind.band[0] && d < this.kind.band[1] && !this.world.isOnDock(x, z);
  }

  place(c) {
    const island = this.world.island;
    for (let i = 0; i < 30; i++) {
      const p = island.shorePoint(this.rng() * Math.PI * 2, this.kind.band[0] + this.rng() * (this.kind.band[1] - this.kind.band[0]));
      if (this.inBand(p.x, p.z) && this.world.getWalkHeight(p.x, p.z) !== null) {
        c.object.position.set(p.x, island.groundHeight(p.x, p.z), p.z);
        c.object.visible = true;
        return;
      }
    }
  }

  update(dt, time, playerPos, onSplash) {
    const k = this.kind;
    for (const c of this.list) {
      if (c.hidden > 0) {
        c.hidden -= dt;
        if (c.hidden <= 0) this.place(c);
        continue;
      }
      const pos = c.object.position;
      const away = Math.hypot(pos.x - playerPos.x, pos.z - playerPos.z);

      if (away < k.fleeRadius && c.state !== 'flee') {
        c.state = 'flee';
        c.timer = 1.2;
        const a = Math.atan2(pos.z - playerPos.z, pos.x - playerPos.x);
        c.dir = { x: Math.cos(a), z: Math.sin(a) };
        if (k.hops) {
          // Frogs head for the water instead.
          const water = this.world.island.shorePoint(Math.atan2(pos.z, pos.x), -1.5);
          const wa = Math.atan2(water.z - pos.z, water.x - pos.x);
          c.dir = { x: Math.cos(wa), z: Math.sin(wa) };
        }
      }

      c.timer -= dt;
      let speed = 0;
      if (c.state === 'idle') {
        if (c.timer <= 0) {
          c.state = 'walk';
          c.timer = 0.8 + this.rng() * 1.5;
          const a = this.rng() * Math.PI * 2;
          c.dir = { x: Math.cos(a), z: Math.sin(a) };
        }
      } else if (c.state === 'walk') {
        speed = k.speed;
        if (c.timer <= 0) {
          c.state = 'idle';
          c.timer = 1 + this.rng() * 3;
        }
      } else if (c.state === 'flee') {
        speed = k.fleeSpeed;
        if (c.timer <= 0) {
          c.state = 'idle';
          c.timer = 1 + this.rng() * 2;
        }
      }

      if (speed > 0) {
        const nx = pos.x + c.dir.x * speed * dt;
        const nz = pos.z + c.dir.z * speed * dt;
        if (k.hops && c.state === 'flee' && this.world.island.inlandDistance(nx, nz) < 0) {
          // Plop! Into the water, back later somewhere else.
          onSplash?.(nx, nz);
          c.hidden = 8 + this.rng() * 8;
          c.object.visible = false;
          c.state = 'idle';
          continue;
        }
        if (this.inBand(nx, nz) || (k.hops && c.state === 'flee')) {
          pos.x = nx;
          pos.z = nz;
        } else {
          c.dir.x *= -1;
          c.dir.z *= -1;
        }
        // Crabs face sideways to their motion; frogs face where they hop.
        const heading = Math.atan2(c.dir.x, c.dir.z);
        c.object.rotation.y = k.hops ? heading : heading + Math.PI / 2;
      }

      const ground = this.world.island.groundHeight(pos.x, pos.z);
      if (k.hops) {
        c.hop = speed > 0 ? (c.hop + dt * (c.state === 'flee' ? 5 : 3)) % 1 : 0;
        pos.y = Math.max(ground, 0) + Math.sin(c.hop * Math.PI) * 0.35;
      } else {
        pos.y = ground;
        const scuttle = speed > 0 ? Math.sin(time * 30) * 0.4 : 0;
        c.legs.forEach((leg, i) => (leg.rotation.x = i % 2 ? scuttle : -scuttle));
      }
    }
  }
}
