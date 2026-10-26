// Birds overhead: gulls circling the island, songbirds flitting across the lake.
// They head home at night and when it pours.

import * as THREE from 'three';
import { flatMat, part } from '../props/materials.js';

function birdModel(colors) {
  const g = new THREE.Group();
  const body = part(new THREE.IcosahedronGeometry(0.22, 0), flatMat(colors.body));
  body.scale.set(1.8, 0.8, 0.8);
  g.add(body);
  g.add(part(new THREE.ConeGeometry(0.05, 0.16, 4).rotateZ(-Math.PI / 2), flatMat(0xffb52e), 0.45, 0, 0));
  const wings = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(0, 0.05, side * 0.1);
    const wing = part(new THREE.BoxGeometry(0.35, 0.03, 0.75), flatMat(colors.wing), 0, 0, side * 0.38);
    pivot.add(wing);
    pivot.add(part(new THREE.BoxGeometry(0.25, 0.031, 0.2), flatMat(colors.tip), -0.03, 0, side * 0.7));
    g.add(pivot);
    wings.push({ pivot, side });
  }
  return { object: g, wings };
}

// Heights stay low: with the tilted top-down camera, anything much higher projects
// off the top of the screen.
const KINDS = {
  gull: { colors: { body: 0xffffff, wing: 0xe6ecf0, tip: 0x3a4250 }, scale: 1.4, height: [4, 6.5], circle: true },
  songbird: { colors: { body: 0x4f7fc9, wing: 0x3a65a8, tip: 0x23345e }, scale: 0.8, height: [3.5, 5], circle: false },
};

export class Birds {
  constructor(world, kind, count) {
    this.world = world;
    this.kind = KINDS[kind];
    this.rng = world.rng;
    this.birds = [];
    for (let i = 0; i < count; i++) {
      const m = birdModel(this.kind.colors);
      m.object.scale.setScalar(this.kind.scale);
      world.root.add(m.object);
      const b = { ...m, phase: this.rng() * 10, visible: 1 };
      this.reset(b, true);
      this.birds.push(b);
    }
  }

  reset(b, anywhere) {
    const [h0, h1] = this.kind.height;
    b.height = h0 + this.rng() * (h1 - h0);
    if (this.kind.circle) {
      b.cx = (this.rng() - 0.5) * 30;
      b.cz = (this.rng() - 0.5) * 30;
      b.radius = 6 + this.rng() * 10;
      b.angle = this.rng() * Math.PI * 2;
      b.speed = (0.2 + this.rng() * 0.15) * (this.rng() > 0.5 ? 1 : -1);
    } else {
      // Fly a straight line across the area, then come back from another side.
      const a = this.rng() * Math.PI * 2;
      const r = 45;
      b.x = Math.cos(a) * r;
      b.z = Math.sin(a) * r;
      const ta = a + Math.PI + (this.rng() - 0.5);
      b.vx = Math.cos(ta) * 5;
      b.vz = Math.sin(ta) * 5;
      if (anywhere) {
        const t = this.rng() * 15;
        b.x += b.vx * t;
        b.z += b.vz * t;
      }
    }
  }

  update(dt, time, away) {
    // away: 0..1, how much birds should be gone (night / heavy rain).
    for (const b of this.birds) {
      b.visible += ((away > 0.5 ? 0 : 1) - b.visible) * Math.min(1, dt);
      b.object.visible = b.visible > 0.05;
      if (!b.object.visible) continue;

      let x, z, heading;
      if (this.kind.circle) {
        b.angle += b.speed * dt;
        x = b.cx + Math.cos(b.angle) * b.radius;
        z = b.cz + Math.sin(b.angle) * b.radius;
        heading = b.angle + (b.speed > 0 ? Math.PI / 2 : -Math.PI / 2);
      } else {
        b.x += b.vx * dt;
        b.z += b.vz * dt;
        if (Math.hypot(b.x, b.z) > 50) this.reset(b, false);
        x = b.x;
        z = b.z;
        heading = Math.atan2(b.vz, b.vx);
      }
      // Rise in from above as they appear / fly off upward as they leave.
      b.object.position.set(x, b.height + Math.sin(time * 0.7 + b.phase) * 0.4 + (1 - b.visible) * 10, z);
      b.object.rotation.set(0, -heading, this.kind.circle ? (b.speed > 0 ? -0.25 : 0.25) : 0);

      // Gulls mostly glide with occasional flaps; songbirds flap fast in bursts.
      const t = time + b.phase;
      const flapping = this.kind.circle ? Math.sin(t * 0.8) > 0.6 : Math.sin(t * 2) > -0.2;
      const flap = flapping ? Math.sin(t * (this.kind.circle ? 9 : 18)) * 0.6 : 0.08;
      for (const w of b.wings) w.pivot.rotation.x = w.side * flap;
    }
  }
}
