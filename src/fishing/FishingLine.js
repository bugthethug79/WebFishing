// The fishing line: a curve from the rod tip to the bobber that sags when slack.

import * as THREE from 'three';

const POINTS = 24;

export class FishingLine {
  constructor(scene) {
    this.positions = new Float32Array(POINTS * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.line = new THREE.Line(
      geo,
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 }),
    );
    this.line.frustumCulled = false;
    scene.add(this.line);
  }

  // slack: 0 = taut, 1 = loose.
  update(from, to, slack) {
    const dist = from.distanceTo(to);
    const sag = slack * Math.min(1.5, dist * 0.12);
    for (let i = 0; i < POINTS; i++) {
      const t = i / (POINTS - 1);
      this.positions[i * 3] = from.x + (to.x - from.x) * t;
      this.positions[i * 3 + 1] = from.y + (to.y - from.y) * t - Math.sin(Math.PI * t) * sag;
      this.positions[i * 3 + 2] = from.z + (to.z - from.z) * t;
    }
    this.line.geometry.attributes.position.needsUpdate = true;
  }
}
