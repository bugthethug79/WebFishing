// Owns the renderer, scene and main loop, and wires the systems together.

import * as THREE from 'three';
import { Input } from './core/Input.js';
import { World } from './world/World.js';
import { createLighting } from './world/lighting.js';
import { Player } from './player/Player.js';
import { CameraRig } from './camera/CameraRig.js';
import { Hud } from './ui/Hud.js';

export class Game {
  constructor(container, hudRoot) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.NoToneMapping; // keep colours punchy
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.input = new Input();
    this.lighting = createLighting(this.scene);
    this.world = new World(this.scene);
    this.player = new Player(this.scene, this.world, this.world.spawn);
    this.cameraRig = new CameraRig(window.innerWidth / window.innerHeight);
    this.cameraRig.snapTo(this.player.position);
    this.hud = new Hud(hudRoot);

    this.timer = new THREE.Timer();
    this.elapsed = 0;

    window.addEventListener('resize', () => this.onResize());
  }

  start() {
    this.renderer.setAnimationLoop((time) => this.tick(time));
  }

  tick(time) {
    this.timer.update(time);
    // Clamp dt so a backgrounded tab doesn't teleport the player.
    const dt = Math.min(this.timer.getDelta(), 1 / 20);
    this.elapsed += dt;

    this.player.update(dt, this.input, this.cameraRig.yaw);
    this.cameraRig.update(dt, this.input, this.player.position);
    this.lighting.follow(this.cameraRig.target);
    this.world.update(this.elapsed);
    this.hud.update(dt, this.input);

    this.renderer.render(this.scene, this.cameraRig.camera);
    this.input.endFrame();
  }

  onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.cameraRig.resize(w / h);
  }
}
