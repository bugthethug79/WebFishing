// The local player: camera-relative movement and collision, driving an Avatar.

import * as THREE from 'three';
import { PLAYER } from '../config.js';
import { damp, angleDelta, lerp } from '../core/math.js';
import { Avatar } from './Avatar.js';

export class Player {
  constructor(scene, world, spawn) {
    this.avatar = new Avatar(scene);
    this.object = this.avatar.object;
    this.velocity = new THREE.Vector2();
    this.teleport(world, spawn);

    // Set by other systems (e.g. fishing) each frame.
    this.pose = 'idle';
    this.canMove = true;
    this.canTurn = true;
  }

  // Place the player in a (possibly new) world at a spawn point { x, z, facing }.
  teleport(world, spawn) {
    this.world = world;
    this.object.position.set(spawn.x, world.getWalkHeight(spawn.x, spawn.z) ?? 0, spawn.z);
    this.facing = spawn.facing ?? 0;
    this.velocity.set(0, 0);
  }

  set onStep(fn) {
    this.avatar.onStep = fn;
  }

  setRod(id) {
    this.avatar.setRod(id);
  }

  setHat(id) {
    this.avatar.setHat(id);
  }

  get position() {
    return this.object.position;
  }

  get forward() {
    return { x: Math.sin(this.facing), z: Math.cos(this.facing) };
  }

  getRodTip(target) {
    return this.avatar.getRodTip(target);
  }

  // Compact description of what this player looks like right now (for multiplayer).
  getSnapshot() {
    const p = this.position;
    return {
      x: +p.x.toFixed(2),
      y: +p.y.toFixed(2),
      z: +p.z.toFixed(2),
      facing: +this.facing.toFixed(3),
      speed: +this.velocity.length().toFixed(2),
      pose: this.pose,
      rod: this.avatar.rodId,
      hat: this.avatar.hatId,
    };
  }

  update(dt, input, cameraYaw) {
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

    this.avatar.animate(dt, this.velocity.length(), this.pose);
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
}
