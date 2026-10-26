// Another player, drawn with the same Avatar as the local player and smoothed
// between network snapshots. Shows their bobber + line and a floating name tag.

import * as THREE from 'three';
import { Avatar } from '../player/Avatar.js';
import { createBobber } from '../fishing/Bobber.js';
import { FishingLine } from '../fishing/FishingLine.js';
import { angleDelta, damp, lerp } from '../core/math.js';

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
    tagRoot.appendChild(this.tag);

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
    this.tag.textContent = s.name;
    this.avatar.setRod(s.rod);
    this.avatar.setHat(s.hat);
    if (first) {
      this.avatar.object.position.set(s.x, s.y, s.z);
      this.avatar.object.rotation.y = s.facing;
    }
  }

  update(dt, camera, visible) {
    const s = this.target;
    const show = visible && !!s;
    this.avatar.object.visible = show;
    this.tag.style.display = show ? '' : 'none';
    if (!show) {
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
  }
}
