// Owns the renderer, scene and main loop, and wires the systems together.

import * as THREE from 'three';
import { Input } from './core/Input.js';
import { World } from './world/World.js';
import { createLighting } from './world/lighting.js';
import { Player } from './player/Player.js';
import { CameraRig } from './camera/CameraRig.js';
import { Hud } from './ui/Hud.js';
import { FishingUI } from './ui/FishingUI.js';
import { FishingSystem } from './fishing/FishingSystem.js';
import { Collection } from './collection/Collection.js';
import { PanelManager } from './ui/PanelManager.js';
import { BucketPanel } from './ui/BucketPanel.js';
import { JournalPanel } from './ui/JournalPanel.js';

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
    this.collection = new Collection();
    const fishingUI = new FishingUI(hudRoot);
    this.fishing = new FishingSystem(this.scene, this.world, this.player, fishingUI);
    this.fishing.onCatch = (c) => this.collection.addCatch(c);
    this.fishing.castWarning = () =>
      this.collection.inventory.isFull ? 'Bucket full! Release some fish (B) to keep new catches.' : null;

    this.panels = new PanelManager(hudRoot);
    this.panels.register('bucket', new BucketPanel(this.collection.inventory, (msg) => fishingUI.toast(msg)));
    this.panels.register('journal', new JournalPanel(this.collection.journal));
    this.hud = new Hud(hudRoot, this.collection, this.panels);
    this.hud.onPanelRequest = (name) => this.togglePanel(name);
    this.cameraFocus = new THREE.Vector3();

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

    this.handleMenuKeys();
    this.input.enabled = !this.panels.isOpen;

    this.player.update(dt, this.input, this.cameraRig.yaw);
    this.fishing.update(dt, this.input, this.cameraRig);
    this.cameraRig.update(dt, this.input, this.fishing.getCameraFocus(this.cameraFocus));
    this.lighting.follow(this.cameraRig.target);
    this.world.update(this.elapsed);
    this.hud.update(dt, this.input);

    this.renderer.render(this.scene, this.cameraRig.camera);
    this.input.endFrame();
  }

  handleMenuKeys() {
    if (this.input.wasPressed('KeyB')) this.togglePanel('bucket');
    if (this.input.wasPressed('KeyJ')) this.togglePanel('journal');
    if (this.input.wasPressed('Escape')) this.panels.close();
  }

  togglePanel(name) {
    // Menus only open between casts so a fish can't escape while you browse.
    if (!this.panels.isOpen && this.fishing.isFishing) return;
    this.panels.toggle(name);
  }

  onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.cameraRig.resize(w / h);
  }
}
