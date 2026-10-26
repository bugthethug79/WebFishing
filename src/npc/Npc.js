// A simple idle NPC: breathes, turns to face the player, waves when they walk up.

import * as THREE from 'three';
import { createCharacterModel } from '../player/characterModel.js';
import { clamp, damp, lerp } from '../core/math.js';

export class Npc {
  constructor(look, { greetRadius = 5 } = {}) {
    this.model = createCharacterModel(look);
    this.object = this.model.root;
    this.greetRadius = greetRadius;
    this.time = Math.random() * 10;
    this.wave = 0; // seconds of waving left
    this.wasNear = false;
    this._local = new THREE.Vector3();
  }

  update(dt, playerPos) {
    this.time += dt;
    const { body, arms, head } = this.model;

    // Player position in our parent's space (NPCs can be children of buildings).
    const local = this._local.copy(playerPos);
    this.object.parent.worldToLocal(local);
    const dx = local.x - this.object.position.x;
    const dz = local.z - this.object.position.z;
    const near = Math.hypot(dx, dz) < this.greetRadius;

    if (near && !this.wasNear) this.wave = 1.6;
    this.wasNear = near;
    this.wave = Math.max(0, this.wave - dt);

    // Turn toward the player when nearby, otherwise face forward.
    const target = near ? clamp(Math.atan2(dx, dz), -1, 1) : 0;
    this.object.rotation.y = lerp(this.object.rotation.y, target, damp(5, dt));

    body.position.y = Math.sin(this.time * 2) * 0.015;
    head.rotation.z = Math.sin(this.time * 0.7) * 0.05;
    const waving = this.wave > 0;
    arms[0].rotation.x = lerp(arms[0].rotation.x, waving ? -2.8 : 0, damp(10, dt));
    arms[0].rotation.z = waving ? -0.12 - Math.sin(this.time * 14) * 0.35 : -0.12;
    arms[1].rotation.x = Math.sin(this.time * 1.3) * 0.05;
  }
}
