// Player controller: camera-relative movement, collision, and procedural animation.

import * as THREE from 'three';
import { PLAYER } from '../config.js';
import { damp, angleDelta, lerp } from '../core/math.js';
import { createCharacterModel, setHat } from './characterModel.js';
import { createRod } from '../fishing/Rod.js';

// Target shoulder angles (rotation.x) for each pose. Negative swings the arm forward;
// around -PI the arm points straight up.
const POSES = {
  idle: { right: -0.45, left: 0 },
  charge: { right: -3.3, left: -0.6 },
  cast: { right: -1.0, left: -0.3 },
  hold: { right: -0.95, left: -0.5 },
  reel: { right: -0.9, left: -0.9 },
  cheer: { right: -2.9, left: -2.9 },
};

export class Player {
  constructor(scene, world, spawn) {
    this.world = world;
    this.model = createCharacterModel();
    this.object = this.model.root;
    scene.add(this.object);

    this.setRod();

    this.velocity = new THREE.Vector2();
    this.teleport(world, spawn);
    this.walkCycle = 0;
    this.time = 0;

    // Set by other systems (e.g. fishing) each frame.
    this.pose = 'idle';
    this.canMove = true;
    this.canTurn = true;
    this.armAngles = { right: POSES.idle.right, left: 0 };
    this.onStep = null; // called with no args on each footfall
    this.lastStepPhase = 0;
  }

  // Place the player in a (possibly new) world at a spawn point { x, z, facing }.
  teleport(world, spawn) {
    this.world = world;
    this.object.position.set(spawn.x, world.getWalkHeight(spawn.x, spawn.z) ?? 0, spawn.z);
    this.facing = spawn.facing ?? 0;
    this.velocity.set(0, 0);
  }

  // The rod lives in the right hand (arms[0] is the character's right).
  setRod(def) {
    if (this.rod) this.model.arms[0].remove(this.rod.object);
    this.rod = createRod(def);
    this.rod.object.position.y = -0.44;
    this.model.arms[0].add(this.rod.object);
  }

  setHat(id) {
    setHat(this.model, id);
  }

  get position() {
    return this.object.position;
  }

  get forward() {
    return { x: Math.sin(this.facing), z: Math.cos(this.facing) };
  }

  getRodTip(target = new THREE.Vector3()) {
    return this.rod.tip.getWorldPosition(target);
  }

  update(dt, input, cameraYaw) {
    this.time += dt;
    const axis = input.getMoveAxis();
    const sprinting = input.isDown('ShiftLeft', 'ShiftRight');
    const speed = this.canMove ? (sprinting ? PLAYER.sprintSpeed : PLAYER.walkSpeed) : 0;

    // Rotate input into world space using the camera's yaw.
    // Camera sits at +Z (yaw 0) looking toward -Z, so "forward" is -Z.
    const sin = Math.sin(cameraYaw);
    const cos = Math.cos(cameraYaw);
    const wx = axis.x * cos - axis.y * sin;
    const wz = -axis.x * sin - axis.y * cos;

    const k = damp(PLAYER.acceleration, dt);
    this.velocity.x = lerp(this.velocity.x, wx * speed, k);
    this.velocity.y = lerp(this.velocity.y, wz * speed, k);

    this.move(dt);

    const moving = Math.hypot(axis.x, axis.y) > 0;
    if (moving && (this.canMove || this.canTurn)) {
      const target = Math.atan2(wx, wz);
      this.facing += angleDelta(this.facing, target) * damp(PLAYER.turnSpeed, dt);
    }
    this.object.rotation.y = this.facing;

    this.animate(dt);
  }

  move(dt) {
    const pos = this.object.position;
    const nx = pos.x + this.velocity.x * dt;
    const nz = pos.z + this.velocity.y * dt;

    // Try the full step, then slide along each axis if blocked by water.
    let next = null;
    if (this.world.getWalkHeight(nx, nz) !== null) next = { x: nx, z: nz };
    else if (this.world.getWalkHeight(nx, pos.z) !== null) next = { x: nx, z: pos.z };
    else if (this.world.getWalkHeight(pos.x, nz) !== null) next = { x: pos.x, z: nz };

    if (next) {
      const resolved = this.world.colliders.resolve({ ...next }, PLAYER.radius);
      // Don't let collision push us into the water.
      if (this.world.getWalkHeight(resolved.x, resolved.z) !== null) next = resolved;
      pos.x = next.x;
      pos.z = next.z;
    }

    const ground = this.world.getWalkHeight(pos.x, pos.z) ?? pos.y;
    pos.y = lerp(pos.y, ground, damp(20, dt));
  }

  animate(dt) {
    const { body, legs, arms, head } = this.model;
    const speed = this.velocity.length();
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
    const pose = POSES[this.pose] ?? POSES.idle;
    const rate = this.pose === 'cast' ? 28 : this.pose === 'charge' ? 10 : 8;
    this.armAngles.right = lerp(this.armAngles.right, pose.right, damp(rate, dt));
    this.armAngles.left = lerp(this.armAngles.left, pose.left, damp(rate, dt));

    let right = this.armAngles.right - swing * 0.3; // rod hand swings less
    let left = this.armAngles.left + swing * 0.8;
    if (this.pose === 'reel') {
      // Crank the reel and jiggle the rod.
      left += Math.sin(this.time * 18) * 0.25;
      right += Math.sin(this.time * 31) * 0.04;
    }
    if (this.pose === 'cheer') {
      const wave = Math.sin(this.time * 8) * 0.12;
      right += wave;
      left -= wave;
    }
    arms[0].rotation.x = right;
    arms[1].rotation.x = left;

    const bob = Math.abs(Math.cos(this.walkCycle)) * 0.08 * moveAmount;
    const breathe = Math.sin(this.time * 2.2) * 0.015 * (1 - moveAmount);
    const hop = this.pose === 'cheer' ? Math.abs(Math.sin(this.time * 8)) * 0.12 : 0;
    body.position.y = bob + breathe + hop;
    body.rotation.x = 0.08 * moveAmount; // lean into the run
    head.rotation.z = Math.sin(this.walkCycle * 0.5) * 0.05 * moveAmount;
  }
}
