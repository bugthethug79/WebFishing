// Player controller: camera-relative movement, collision, and procedural animation.

import * as THREE from 'three';
import { PLAYER } from '../config.js';
import { damp, angleDelta, lerp } from '../core/math.js';
import { createPlayerModel } from './playerModel.js';

export class Player {
  constructor(scene, world, spawn) {
    this.world = world;
    this.model = createPlayerModel();
    this.object = this.model.root;
    this.object.position.copy(spawn);
    scene.add(this.object);

    this.velocity = new THREE.Vector2();
    this.facing = 0; // facing the camera on spawn
    this.walkCycle = 0;
    this.time = 0;
  }

  get position() {
    return this.object.position;
  }

  update(dt, input, cameraYaw) {
    this.time += dt;
    const axis = input.getMoveAxis();
    const sprinting = input.isDown('ShiftLeft', 'ShiftRight');
    const speed = sprinting ? PLAYER.sprintSpeed : PLAYER.walkSpeed;

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
    if (moving) {
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
    arms[0].rotation.x = -swing * 0.8;
    arms[1].rotation.x = swing * 0.8;

    const bob = Math.abs(Math.cos(this.walkCycle)) * 0.08 * moveAmount;
    const breathe = Math.sin(this.time * 2.2) * 0.015 * (1 - moveAmount);
    body.position.y = bob + breathe;
    body.rotation.x = 0.08 * moveAmount; // lean into the run
    head.rotation.z = Math.sin(this.walkCycle * 0.5) * 0.05 * moveAmount;
  }
}
