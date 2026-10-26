// Owns the renderer, scene and main loop, and wires the systems together.

import * as THREE from 'three';
import { Input } from './core/Input.js';
import { Settings } from './core/Settings.js';
import { clamp } from './core/math.js';
import { World } from './world/World.js';
import { inlandDistance } from './world/island.js';
import { createLighting } from './world/lighting.js';
import { Player } from './player/Player.js';
import { CameraRig } from './camera/CameraRig.js';
import { CAMERA } from './config.js';
import { Audio } from './audio/Audio.js';
import { FishingSystem } from './fishing/FishingSystem.js';
import { Collection } from './collection/Collection.js';
import { Hud } from './ui/Hud.js';
import { FishingUI } from './ui/FishingUI.js';
import { PanelManager } from './ui/PanelManager.js';
import { BucketPanel } from './ui/BucketPanel.js';
import { JournalPanel } from './ui/JournalPanel.js';
import { PausePanel } from './ui/PausePanel.js';
import { InteractPrompt } from './ui/InteractPrompt.js';
import { DialogBox } from './ui/DialogBox.js';
import { TitleScreen } from './ui/TitleScreen.js';
import { ZoneBanner } from './ui/ZoneBanner.js';

export class Game {
  constructor(container, hudRoot) {
    this.settings = new Settings();

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.NoToneMapping; // keep colours punchy
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.input = new Input();
    this.audio = new Audio(this.settings);
    this.lighting = createLighting(this.scene);
    this.world = new World(this.scene);
    this.player = new Player(this.scene, this.world, this.world.spawn);
    this.player.onStep = () => this.audio.play('step', { surface: this.surfaceUnderPlayer() }, 0.12);
    this.cameraRig = new CameraRig(window.innerWidth / window.innerHeight);
    this.cameraRig.snapTo(this.player.position);
    this.cameraFocus = new THREE.Vector3();

    // Fishing + collection.
    this.collection = new Collection();
    const fishingUI = new FishingUI(hudRoot);
    fishingUI.onToast = () => this.audio.play('toast');
    this.fishing = new FishingSystem(this.scene, this.world, this.player, fishingUI);
    this.fishing.audio = this.audio;
    this.fishing.onCatch = (c) => this.collection.addCatch(c);
    this.fishing.castWarning = () =>
      this.collection.inventory.isFull ? 'Bucket full! Release some fish (B) to keep new catches.' : null;

    // Menus and overlays.
    this.panels = new PanelManager(hudRoot);
    this.panels.register(
      'bucket',
      new BucketPanel(this.collection.inventory, (msg) => {
        fishingUI.toast(msg);
        this.audio.play('splash', { size: 0.5 });
      }),
    );
    this.panels.register('journal', new JournalPanel(this.collection.journal));
    this.panels.register(
      'pause',
      new PausePanel(this.settings, () => this.panels.close(), () => this.audio.play('click', {}, 0.1)),
    );
    this.panels.onOpen = () => this.audio.play('open');
    this.panels.onClose = () => this.audio.play('close');

    this.hud = new Hud(hudRoot, this.collection, this.panels);
    this.hud.onPanelRequest = (name) => this.togglePanel(name);
    this.prompt = new InteractPrompt(hudRoot);
    this.dialog = new DialogBox(hudRoot);
    this.dialog.onTalk = () => this.audio.play('talk');
    this.dialog.onClose = () => this.audio.play('close');
    this.zoneBanner = new ZoneBanner(hudRoot);

    // Soft click on every UI button.
    hudRoot.addEventListener('click', (e) => e.target.closest('button') && this.audio.play('click'));

    this.started = false;
    this.hudRoot = hudRoot;
    hudRoot.classList.add('pre-start');
    this.titleScreen = new TitleScreen(hudRoot, () => this.onStart());

    this.settings.on('change', () => this.applySettings());
    this.applySettings();

    this.timer = new THREE.Timer();
    this.elapsed = 0;
    this._screen = new THREE.Vector3();

    window.addEventListener('resize', () => this.onResize());
  }

  start() {
    this.renderer.setAnimationLoop((time) => this.tick(time));
  }

  onStart() {
    this.started = true;
    this.hudRoot.classList.remove('pre-start');
    this.audio.start();
    // Settle the camera back onto a 45-degree step after the title orbit.
    this.cameraRig.targetYaw = Math.round(this.cameraRig.yaw / CAMERA.rotateStep) * CAMERA.rotateStep;
    setTimeout(() => this.zoneBanner.show(this.world.zone), 400);
  }

  get paused() {
    return this.panels.current === 'pause';
  }

  tick(time) {
    this.timer.update(time);
    // Clamp dt so a backgrounded tab doesn't teleport the player.
    const dt = Math.min(this.timer.getDelta(), 1 / 20);

    if (this.started) this.handleMenuKeys();
    this.input.enabled = this.started && !this.panels.isOpen && !this.dialog.isOpen;
    this.dialog.update(dt, this.input);
    this.hudRoot.classList.toggle('dialog-open', this.dialog.isOpen);

    if (!this.paused) {
      this.elapsed += dt;
      if (!this.started) this.cameraRig.targetYaw += dt * 0.12; // slow orbit behind the title
      this.player.update(dt, this.input, this.cameraRig.yaw);
      this.fishing.update(dt, this.input, this.cameraRig);
      this.cameraRig.update(dt, this.input, this.fishing.getCameraFocus(this.cameraFocus));
      this.lighting.follow(this.cameraRig.target);
      this.world.update(this.elapsed);
      this.audio.update(this.shoreProximity());
    }
    this.updateInteraction();
    this.hud.update(dt, this.input);

    this.renderer.render(this.scene, this.cameraRig.camera);
    this.input.endFrame();
  }

  handleMenuKeys() {
    const input = this.input;
    if (input.wasPressed('Escape')) {
      if (this.dialog.isOpen) this.dialog.close();
      else if (this.panels.isOpen) this.panels.close();
      else this.panels.open('pause');
      return;
    }
    if (this.dialog.isOpen) return;
    if (input.wasPressed('KeyB')) this.togglePanel('bucket');
    if (input.wasPressed('KeyJ')) this.togglePanel('journal');
  }

  togglePanel(name) {
    if (this.dialog.isOpen) return;
    // Bucket/journal only open between casts so a fish can't escape while you browse.
    // Pause can always open: it freezes the game.
    if (name !== 'pause' && !this.panels.isOpen && this.fishing.isFishing) return;
    this.panels.toggle(name);
  }

  updateInteraction() {
    const canInteract = this.input.enabled && !this.fishing.isFishing;
    const p = this.player.position;
    const target = canInteract ? this.world.nearestInteractable(p.x, p.z) : null;
    if (!target) {
      this.prompt.hide();
      return;
    }
    const s = this._screen.set(target.x, target.y, target.z).project(this.cameraRig.camera);
    this.prompt.show(target.verb, (s.x * 0.5 + 0.5) * window.innerWidth, (-s.y * 0.5 + 0.5) * window.innerHeight);
    if (this.input.wasPressed('KeyF')) {
      this.prompt.hide();
      this.audio.play('open');
      this.dialog.open(target.dialog);
    }
  }

  surfaceUnderPlayer() {
    const { x, z } = this.player.position;
    if (this.world.isOnDock(x, z)) return 'wood';
    return inlandDistance(x, z) < 4 ? 'sand' : 'grass';
  }

  // 1 at the water's edge (or on the dock), fading to 0 well inland.
  shoreProximity() {
    const { x, z } = this.player.position;
    if (this.world.isOnDock(x, z)) return 1;
    return clamp(1 - inlandDistance(x, z) / 14, 0, 1);
  }

  applySettings() {
    const s = this.settings;
    this.lighting.sun.castShadow = s.get('shadows');
    this.renderer.setPixelRatio(s.get('highResolution') ? Math.min(window.devicePixelRatio, 2) : 1);
    this.hud.setControlsVisible(s.get('showControls'));
  }

  onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.cameraRig.resize(w / h);
  }
}
