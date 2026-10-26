// Another player, drawn with the same Avatar as the local player and smoothed
// between network snapshots. Shows their bobber + line and a floating name tag.

import * as THREE from 'three';
import { Avatar } from '../player/Avatar.js';
import { createBobber } from '../fishing/Bobber.js';
import { FishingLine } from '../fishing/FishingLine.js';
import { angleDelta, damp, lerp } from '../core/math.js';
import { FISH_BY_ID } from '../collection/fishData.js';
import { createFishModel } from '../fishing/fishModel.js';

export class RemotePlayer {
  constructor(scene, tagRoot, id) {
    this.id = id;
    this.scene = scene;
    this.avatar = new Avatar(scene);
    this.bobber = createBobber();
    this.bobber.visible = false;
    scene.add(this.bobber);
    this.line = new FishingLine(scene);
    this.line.line.visible = false;
    this.tag = document.createElement('div');
    this.tag.className = 'name-tag';
    this.tagName = document.createElement('span');
    this.bubble = document.createElement('div');
    this.bubble.className = 'chat-bubble';
    this.tag.append(this.bubble, this.tagName);
    tagRoot.appendChild(this.tag);
    this.bubbleTimer = null;
    this.held = null; // { key, object } fish they're showing off

    this.target = null; // latest snapshot
    this.zone = null;
    this.lastSeen = performance.now();
    this._tip = new THREE.Vector3();
    this._end = new THREE.Vector3();
    this._screen = new THREE.Vector3();
  }

  // snapshot: { name, zone, x, y, z, facing, speed, pose, rod, hat, bobber: [x,y,z] | null }
  receive(s) {
    const first = !this.target;
    this.target = s;
    this.zone = s.zone;
    this.lastSeen = performance.now();
    this.tagName.textContent = s.name;
    this.updateHeld(s.holding);
    this.avatar.setRod(s.rod);
    this.avatar.setHat(s.hat);
    if (first) {
      this.avatar.object.position.set(s.x, s.y, s.z);
      this.avatar.object.rotation.y = s.facing;
    }
  }

  // Speech bubble over their head for a few seconds.
  say(text) {
    this.bubble.textContent = text;
    this.bubble.classList.add('visible');
    clearTimeout(this.bubbleTimer);
    this.bubbleTimer = setTimeout(() => this.bubble.classList.remove('visible'), 6000);
  }

  // Show the fish they just caught above their head, like the local catch animation.
  updateHeld(holding) {
    const key = holding ? `${holding.fish}:${holding.size}` : null;
    if (key === this.held?.key) return;
    if (this.held) this.scene.remove(this.held.object);
    this.held = null;
    const species = holding && FISH_BY_ID[holding.fish];
    if (!species) return;
    const { object } = createFishModel(species, holding.size);
    this.scene.add(object);
    this.held = { key, object };
  }

  update(dt, camera, visible) {
    const s = this.target;
    const show = visible && !!s;
    this.avatar.object.visible = show;
    this.tag.style.display = show ? '' : 'none';
    if (!show) {
      if (this.held) this.held.object.visible = false;
      this.bobber.visible = false;
      this.line.line.visible = false;
      return;
    }

    // Glide toward the latest snapshot (sent ~10x a second) for smooth motion.
    const obj = this.avatar.object;
    const k = damp(12, dt);
    obj.position.set(lerp(obj.position.x, s.x, k), lerp(obj.position.y, s.y, k), lerp(obj.position.z, s.z, k));
    obj.rotation.y += angleDelta(obj.rotation.y, s.facing) * k;
    this.avatar.animate(dt, s.speed, s.pose);
    if (this.held) {
      const f = this.held.object;
      f.visible = show;
      f.position.set(obj.position.x, obj.position.y + 2.9, obj.position.z);
      f.rotation.set(0, Math.atan2(camera.position.x - obj.position.x, camera.position.z - obj.position.z) - Math.PI / 2, Math.sin(performance.now() / 100) * 0.25);
    }

    if (s.bobber) {
      this.bobber.visible = true;
      this.bobber.position.lerp(this._end.set(...s.bobber), k);
      this.avatar.getRodTip(this._tip);
      this._end.copy(this.bobber.position);
      this._end.y += 0.28;
      this.line.line.visible = true;
      this.line.update(this._tip, this._end, s.pose === 'reel' ? 0.1 : 0.6);
    } else {
      this.bobber.visible = false;
      this.line.line.visible = false;
    }

    const p = this._screen.copy(obj.position);
    p.y += 3; // above the hat
    p.project(camera);
    this.tag.style.transform = `translate(${(p.x * 0.5 + 0.5) * window.innerWidth}px, ${(-p.y * 0.5 + 0.5) * window.innerHeight}px) translate(-50%, -100%)`;
  }

  dispose() {
    this.avatar.remove();
    this.scene.remove(this.bobber);
    this.scene.remove(this.line.line);
    this.tag.remove();
    if (this.held) this.scene.remove(this.held.object);
  }
}
