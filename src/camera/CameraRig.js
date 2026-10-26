// Fixed-angle, top-down follow camera (Cubic Castles style).
// Scroll to zoom, Q / E to rotate around the player in 45 degree steps.

import * as THREE from 'three';
import { CAMERA } from '../config.js';
import { clamp, damp, lerp } from '../core/math.js';

export class CameraRig {
  constructor(aspect) {
    this.camera = new THREE.PerspectiveCamera(CAMERA.fov, aspect, 0.5, 400);
    this.target = new THREE.Vector3();
    this.yaw = 0;
    this.targetYaw = 0;
    this.distance = CAMERA.distance;
    this.targetDistance = CAMERA.distance;
  }

  snapTo(position) {
    this.target.copy(position);
    this.apply();
  }

  update(dt, input, followPos) {
    if (input.wasPressed('KeyQ')) this.targetYaw -= CAMERA.rotateStep;
    if (input.wasPressed('KeyE')) this.targetYaw += CAMERA.rotateStep;

    const wheel = input.consumeWheel();
    if (wheel) {
      this.targetDistance = clamp(this.targetDistance + wheel * 2, CAMERA.minDistance, CAMERA.maxDistance);
    }

    this.yaw = lerp(this.yaw, this.targetYaw, damp(8, dt));
    this.distance = lerp(this.distance, this.targetDistance, damp(8, dt));
    this.target.lerp(followPos, damp(CAMERA.followDamping, dt));
    this.apply();
  }

  apply() {
    const horizontal = Math.cos(CAMERA.pitch) * this.distance;
    this.camera.position.set(
      this.target.x + Math.sin(this.yaw) * horizontal,
      this.target.y + Math.sin(CAMERA.pitch) * this.distance,
      this.target.z + Math.cos(this.yaw) * horizontal,
    );
    this.camera.lookAt(this.target.x, this.target.y + 0.8, this.target.z);
  }

  resize(aspect) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}
