// A character you can see: model, rod, hat and procedural animation.
// It knows nothing about input or physics; it's driven by a small state
// { speed, pose } each frame. The local Player drives one from the keyboard;
// remote players in multiplayer drive one from network snapshots.

import * as THREE from 'three';
import { PLAYER } from '../config.js';
import { damp, lerp } from '../core/math.js';
import { createCharacterModel, setHat } from './characterModel.js';
import { createRod } from '../fishing/Rod.js';
import { RODS, byId } from '../economy/items.js';

// Target shoulder angles (rotation.x) for each pose. Negative swings the arm forward;
// around -PI the arm points straight up.
export const POSES = {
  idle: { right: -0.45, left: 0 },
  charge: { right: -3.3, left: -0.6 },
  cast: { right: -1.0, left: -0.3 },
  hold: { right: -0.95, left: -0.5 },
  reel: { right: -0.9, left: -0.9 },
  cheer: { right: -2.9, left: -2.9 },
};

export class Avatar {
  constructor(scene, look) {
    this.model = createCharacterModel(look);
    this.object = this.model.root;
    scene.add(this.object);
    this.scene = scene;

    this.walkCycle = 0;
    this.time = 0;
    this.armAngles = { right: POSES.idle.right, left: 0 };
    this.lastStepPhase = 0;
    this.onStep = null; // called on each footfall
    this.rodId = null;
    this.hatId = null;
    this.setRod('bamboo');
  }

  // The rod lives in the right hand (arms[0] is the character's right).
  setRod(id) {
    if (id === this.rodId) return;
    this.rodId = id;
    if (this.rod) this.model.arms[0].remove(this.rod.object);
    this.rod = createRod(byId(RODS, id) ?? RODS[0]);
    this.rod.object.position.y = -0.44;
    this.model.arms[0].add(this.rod.object);
  }

  setHat(id) {
    if (id === this.hatId) return;
    this.hatId = id;
    setHat(this.model, id);
  }

  getRodTip(target = new THREE.Vector3()) {
    return this.rod.tip.getWorldPosition(target);
  }

  remove() {
    this.scene.remove(this.object);
  }

  // speed: ground speed (units/s). pose: one of POSES.
  animate(dt, speed, pose) {
    this.time += dt;
    const { body, legs, arms, head } = this.model;
    const moveAmount = Math.min(1, speed / PLAYER.walkSpeed);

    this.walkCycle += dt * (4 + speed * 1.6);
    const swing = Math.sin(this.walkCycle) * 0.7 * moveAmount;

    legs[0].rotation.x = swing;
    legs[1].rotation.x = -swing;

    // A foot lands every half walk cycle.
    const phase = Math.floor(this.walkCycle / Math.PI);
    if (phase !== this.lastStepPhase) {
      this.lastStepPhase = phase;
      if (moveAmount > 0.3) this.onStep?.();
    }

    // Arms blend toward the current pose; the cast swing is snappy, the rest gentle.
    const target = POSES[pose] ?? POSES.idle;
    const rate = pose === 'cast' ? 28 : pose === 'charge' ? 10 : 8;
    this.armAngles.right = lerp(this.armAngles.right, target.right, damp(rate, dt));
    this.armAngles.left = lerp(this.armAngles.left, target.left, damp(rate, dt));

    let right = this.armAngles.right - swing * 0.3; // rod hand swings less
    let left = this.armAngles.left + swing * 0.8;
    if (pose === 'reel') {
      // Crank the reel and jiggle the rod.
      left += Math.sin(this.time * 18) * 0.25;
      right += Math.sin(this.time * 31) * 0.04;
    }
    if (pose === 'cheer') {
      const wave = Math.sin(this.time * 8) * 0.12;
      right += wave;
      left -= wave;
    }
    arms[0].rotation.x = right;
    arms[1].rotation.x = left;

    const bob = Math.abs(Math.cos(this.walkCycle)) * 0.08 * moveAmount;
    const breathe = Math.sin(this.time * 2.2) * 0.015 * (1 - moveAmount);
    const hop = pose === 'cheer' ? Math.abs(Math.sin(this.time * 8)) * 0.12 : 0;
    body.position.y = bob + breathe + hop;
    body.rotation.x = 0.08 * moveAmount; // lean into the run
    head.rotation.z = Math.sin(this.walkCycle * 0.5) * 0.05 * moveAmount;
  }
}
