// Owns the renderer, scene and main loop, and wires the systems together.

import * as THREE from 'three';
import { Input } from './core/Input.js';
import { Settings } from './core/Settings.js';
import { clamp } from './core/math.js';
import { World } from './world/World.js';
import { ZONES_BY_ID } from './world/zones/index.js';
import { createLighting } from './world/lighting.js';
import { Player } from './player/Player.js';
import { CameraRig } from './camera/CameraRig.js';
import { CAMERA } from './config.js';
import { Audio } from './audio/Audio.js';
import { TimeOfDay } from './environment/TimeOfDay.js';
import { Weather } from './environment/Weather.js';
import { Sky } from './environment/Sky.js';
import { Rain } from './environment/Rain.js';
import { Particles } from './effects/Particles.js';
import { windUniforms } from './world/wind.js';
import { PLAYER } from './config.js';
import { FishingSystem } from './fishing/FishingSystem.js';
import { Collection } from './collection/Collection.js';
import { PlayerState } from './economy/PlayerState.js';
import { Shop } from './economy/Shop.js';
import { Hud } from './ui/Hud.js';
import { FishingUI } from './ui/FishingUI.js';
import { PanelManager } from './ui/PanelManager.js';
import { BucketPanel } from './ui/BucketPanel.js';
import { JournalPanel } from './ui/JournalPanel.js';
import { PausePanel } from './ui/PausePanel.js';
import { ShopPanel } from './ui/ShopPanel.js';
import { TravelPanel } from './ui/TravelPanel.js';
import { el } from './ui/format.js';
import { Profile, cleanName } from './save/Profile.js';
import { SaveManager, encodeSave, decodeSave } from './save/SaveManager.js';
import { LocalStorageBackend } from './save/storage.js';
import { Multiplayer } from './net/Multiplayer.js';
import { BroadcastClient } from './net/BroadcastClient.js';
import { ServerSaveBackend } from './net/OnlineSession.js';
import { Chat } from './ui/Chat.js';
import { PlayerList } from './ui/PlayerList.js';
import { ConnectionOverlay } from './ui/ConnectionOverlay.js';
import { HOUR_SECONDS } from './environment/TimeOfDay.js';
import { Inventory } from './collection/Inventory.js';
import { Journal } from './collection/Journal.js';
import { InteractPrompt } from './ui/InteractPrompt.js';
import { DialogBox } from './ui/DialogBox.js';
import { TitleScreen } from './ui/TitleScreen.js';
import { ZoneBanner } from './ui/ZoneBanner.js';

export class Game {
  // saveData: an already-loaded save (or null for a new player); backend: where to save.
  constructor(container, hudRoot, { saveData = null, backend = new LocalStorageBackend() } = {}) {
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
    this.time = new TimeOfDay();
    this.weather = new Weather();
    this.sky = new Sky(this.lighting, this.scene);
    this.rain = new Rain(this.scene);
    this.particles = new Particles(this.scene);

    // Who you are and what you own, restored from the save before the world is built.
    this.profile = new Profile();
    this.collection = new Collection();
    this.state = new PlayerState();
    this.shop = new Shop(this.collection.inventory, this.state);
    this.metMarina = false;
    this.save = new SaveManager(backend, {
      profile: this.profile,
      state: this.state,
      inventory: this.collection.inventory,
      journal: this.collection.journal,
      getPlayer: () => ({
        zone: this.world.zone.id,
        x: +this.player.position.x.toFixed(2),
        z: +this.player.position.z.toFixed(2),
        facing: +this.player.facing.toFixed(3),
      }),
      getFlags: () => ({ metMarina: this.metMarina }),
    });
    if (saveData) {
      this.save.apply(saveData);
      this.metMarina = !!saveData.flags?.metMarina;
    }

    const zone = ZONES_BY_ID[saveData?.player?.zone] ?? ZONES_BY_ID.sunny;
    this.world = new World(this.scene, zone);
    this.hookWorld();
    this.player = new Player(this.scene, this.world, this.savedSpawn(saveData?.player));
    this.player.onStep = () => this.onStep();
    this.cameraRig = new CameraRig(window.innerWidth / window.innerHeight);
    this.cameraRig.snapTo(this.player.position);
    this.cameraFocus = new THREE.Vector3();

    const fishingUI = new FishingUI(hudRoot);
    this.toast = (msg, ms) => fishingUI.toast(msg, ms);
    fishingUI.onToast = () => this.audio.play('toast');
    this.player.setRod(this.state.rodId);
    this.player.setHat(this.state.hatId);
    this.state.on('change', ({ what }) => {
      if (what === 'rod') this.player.setRod(this.state.rodId);
      if (what === 'hat') this.player.setHat(this.state.hatId);
    });
    this.fishing = new FishingSystem(this.scene, this.world, this.player, fishingUI);
    this.fishing.audio = this.audio;
    this.fishing.particles = this.particles;
    this.fishing.onShake = (amount) => this.cameraRig.shake(amount);
    this.fishing.onCatch = (c) => {
      this.net?.announceCatch(c, this.profile.name);
      return this.collection.addCatch(c);
    };
    this.fishing.getRod = () => this.state.rod;
    this.fishing.getConditions = () => ({
      zone: this.world.zone.id,
      night: this.time.isNight,
      raining: this.weather.isRaining,
    });
    this.fishing.useBait = () => {
      const { bait, ranOut } = this.state.useBait();
      if (ranOut) this.toast(`That was your last ${bait.name}!`);
      return bait;
    };
    this.fishing.castWarning = () =>
      this.collection.inventory.isFull ? 'Bucket full! Release some fish (B) to keep new catches.' : null;

    // Menus and overlays.
    this.panels = new PanelManager(hudRoot);
    this.panels.register(
      'bucket',
      new BucketPanel(
        this.collection.inventory,
        (msg) => {
          fishingUI.toast(msg);
          this.audio.play('splash', { size: 0.5 });
        },
        (item) => this.shop.priceOf(item),
      ),
    );
    this.panels.register(
      'shop',
      new ShopPanel(this.shop, this.state, {
        onSold: (coins, count) => this.audio.play('coins', { count }),
        onBought: () => this.audio.play('buy'),
        onEquip: () => this.audio.play('equip'),
        onCantAfford: () => {
          this.audio.play('error');
          this.toast('Not enough coins yet!');
        },
      }),
    );
    this.panels.register('journal', new JournalPanel(this.collection.journal));
    this.pausePanel = new PausePanel(this.settings, () => this.panels.close(), () => this.audio.play('click', {}, 0.1), {
        getName: () => this.profile.name,
        onRename: (name) => {
          this.profile.name = cleanName(name);
          this.save.save();
        },
        onExport: () => encodeSave(this.save.collect()),
        onImport: (code) => {
          const data = decodeSave(code);
          if (!data) return false;
          // Stop autosave first so leaving the page doesn't overwrite the imported save.
          this.save.enabled = false;
          backend.save(data).then(() => location.reload());
          return true;
        },
        onReset: () => this.save.clear().then(() => location.reload()),
      });
    this.panels.register('pause', this.pausePanel);
    this.panels.register(
      'travel',
      new TravelPanel(this.collection.journal, () => this.world.zone.id, (id) => this.travelTo(id)),
    );
    this.panels.onOpen = () => this.audio.play('open');
    this.panels.onClose = () => this.audio.play('close');

    this.hud = new Hud(hudRoot, this.collection, this.state);
    this.hud.onPanelRequest = (name) => this.togglePanel(name);
    this.prompt = new InteractPrompt(hudRoot);
    this.dialog = new DialogBox(hudRoot);
    this.dialog.onTalk = () => this.audio.play('talk');
    this.dialog.onClose = () => {
      this.audio.play('close');
      const next = this.afterDialog;
      this.afterDialog = null;
      next?.();
    };
    this.zoneBanner = new ZoneBanner(hudRoot);
    this.fade = el('<div class="fade"></div>');
    hudRoot.appendChild(this.fade);
    this.traveling = false;

    // Soft click on every UI button.
    hudRoot.addEventListener('click', (e) => e.target.closest('button') && this.audio.play('click'));

    this.started = false;
    this.hudRoot = hudRoot;
    hudRoot.classList.add('pre-start');
    this.titleScreen = new TitleScreen(hudRoot, this.profile, {
      onSolo: (name) => this.startSolo(name),
      onOnline: (session, welcome) => this.startOnline(session, welcome),
    });

    this.savedIndicator = el('<div class="saved-indicator">💾 Saved</div>');
    hudRoot.appendChild(this.savedIndicator);
    this.save.on('saved', () => {
      this.savedIndicator.classList.add('visible');
      clearTimeout(this.savedTimer);
      this.savedTimer = setTimeout(() => this.savedIndicator.classList.remove('visible'), 1400);
    });

    // Multiplayer test mode between tabs of this browser (?lan). A server transport comes later.
    if (new URLSearchParams(location.search).has('lan')) this.startMultiplayer(new BroadcastClient());

    this.settings.on('change', () => this.applySettings());
    this.applySettings();

    this.timer = new THREE.Timer();
    this.elapsed = 0;
    this._screen = new THREE.Vector3();

    window.addEventListener('resize', () => this.onResize());
  }

  start() {
    this.renderer.setAnimationLoop(() => this.tick());
  }

  // A spawn point from the save, if it's still somewhere you can stand.
  savedSpawn(p) {
    if (p && this.world.getWalkHeight(p.x, p.z) !== null) return { x: p.x, z: p.z, facing: p.facing ?? 0 };
    return this.world.spawn;
  }

  startMultiplayer(client, { server = false, roster = [] } = {}) {
    this.net = new Multiplayer(this.scene, this.hudRoot, client, {
      server,
      roster,
      getLocal: () => this.localSnapshot(),
      onCatch: (m) => {
        const text = `🎣 ${m.name} caught a ${m.size} cm ${m.fish}!`;
        if (this.chat) this.chat.add(null, text, { system: true });
        if (!this.chat || m.rarity === 'Rare' || m.rarity === 'Legendary') this.toast(text, 2600);
      },
      // With a server, joins/leaves arrive as chat lines instead.
      onPeersChanged: (count, name, what) => !server && name && this.toast(`${name} ${what}`, 1800),
      onChat: (m, peer) => {
        this.chat?.add(m.system ? null : m.name, m.text, { system: m.system, self: m.from === client.id });
        if (!m.system) peer?.say(m.text);
      },
    });
  }

  // What other players need to draw us.
  localSnapshot() {
    const out = { ...this.player.getSnapshot(), name: this.profile.name, zone: this.world.zone.id, bobber: null, holding: null };
    if (this.fishing.state === 'caught' && this.fishing.catch) {
      out.holding = { fish: this.fishing.catch.species.id, size: this.fishing.catch.size };
    }
    if (['casting', 'waiting', 'bite', 'reeling', 'retrieving'].includes(this.fishing.state)) {
      const b = this.fishing.bobber.position;
      out.bobber = [+b.x.toFixed(2), +b.y.toFixed(2), +b.z.toFixed(2)];
    }
    return out;
  }

  startSolo(name) {
    if (this.profile.isNew) {
      this.profile.name = cleanName(name);
      this.profile.isNew = false;
    }
    this.save.enabled = true;
    this.save.save(); // so next visit says "welcome back"
    this.begin();
  }

  // Logged in to a community server: play with that account's save and other players.
  startOnline(session, welcome) {
    this.online = { session, server: welcome.server.name };
    // Progress lives on the server now; the local solo save is left untouched.
    this.save.backend = new ServerSaveBackend(session);
    const data = welcome.save ?? {};
    this.save.apply({
      profile: { id: this.profile.id, name: welcome.name },
      state: data.state ?? new PlayerState().toJSON(),
      inventory: data.inventory ?? new Inventory().toJSON(),
      journal: data.journal ?? new Journal().toJSON(),
    });
    this.metMarina = !!data.flags?.metMarina;
    this.loadZone(data.player?.zone ?? 'sunny', data.player);
    this.syncClock(welcome.serverTime);

    this.chat = new Chat(
      this.hudRoot,
      (text) => session.send({ type: 'chat', text }),
      () => this.started && !this.panels.isOpen && !this.dialog.isOpen && !this.connection?.isOpen,
    );
    this.playerList = new PlayerList(this.hudRoot);
    this.connection = new ConnectionOverlay(this.hudRoot);
    this.chat.add(null, `Connected to ${welcome.server.name}. Press T to chat, hold Tab to see who's here.`, { system: true });
    if (welcome.server.motd) this.chat.add(null, welcome.server.motd, { system: true });

    this.startMultiplayer(session, { server: true, roster: welcome.players });
    session.on('disconnected', (reason) => this.connection.reconnecting(reason));
    session.on('reconnected', (w) => {
      this.connection.hide();
      this.net.clear();
      this.syncClock(w.serverTime);
      this.chat.add(null, 'Reconnected!', { system: true });
    });
    session.on('ended', (reason) => this.connection.ended(reason));

    this.pausePanel.setOnline({
      server: welcome.server.name,
      name: welcome.name,
      onLeave: async () => {
        await this.save.save();
        session.close();
        location.reload();
      },
    });

    this.save.enabled = true;
    this.save.save();
    this.begin();
  }

  // Use the server's clock for time of day, so everyone's sunset matches.
  syncClock(serverTime) {
    if (serverTime) this.time.offset = (serverTime - Date.now()) / 1000 / HOUR_SECONDS;
  }

  // Swap zones instantly (no fade), e.g. when an online save starts somewhere else.
  loadZone(zoneId, spot) {
    const zone = ZONES_BY_ID[zoneId] ?? ZONES_BY_ID.sunny;
    if (zone.id !== this.world.zone.id) {
      this.fishing.reset();
      this.world.dispose();
      this.world = new World(this.scene, zone);
      this.fishing.world = this.world;
      this.hookWorld();
    }
    this.player.teleport(this.world, this.savedSpawn(spot));
    this.cameraRig.snapTo(this.player.position);
  }

  begin() {
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

  tick() {
    // Use performance.now() rather than the rAF timestamp: in a tab that starts in the
    // background the first rAF timestamp can predate the timer, giving a negative dt.
    this.timer.update();
    // Clamp dt: never negative, and a backgrounded tab mustn't teleport the player.
    const dt = Math.min(Math.max(this.timer.getDelta(), 0), 1 / 20);

    if (this.started) this.handleMenuKeys();
    this.input.enabled =
      this.started && !this.panels.isOpen && !this.dialog.isOpen && !this.traveling && !this.chat?.isOpen && !this.connection?.isOpen;
    this.dialog.update(dt, this.input);
    this.hudRoot.classList.toggle('dialog-open', this.dialog.isOpen);

    if (!this.paused) {
      this.elapsed += dt;
      if (!this.started) this.cameraRig.targetYaw += dt * 0.12; // slow orbit behind the title
      this.player.update(dt, this.input, this.cameraRig.yaw);
      this.fishing.update(dt, this.input, this.cameraRig);
      this.cameraRig.update(dt, this.input, this.fishing.getCameraFocus(this.cameraFocus));
      this.updateEnvironment(dt);
    }
    this.net?.update(dt, this.cameraRig.camera, this.world.zone.id);
    this.updateInteraction();
    this.hud.update(dt, this.input);

    this.renderer.render(this.scene, this.cameraRig.camera);
    this.input.endFrame();
  }

  updateEnvironment(dt) {
    // Time and weather follow the shared real-world clock (see TimeOfDay / Weather).
    this.weather.update(dt, this.time.totalHours);
    const night = this.time.night;
    this.sky.update(this.time, this.weather, night);
    this.lighting.follow(this.cameraRig.target);
    this.world.water.foamColor.setScalar(this.sky.brightness);
    this.world.update(this.elapsed, dt, this.player.position, { night, rain: this.weather.rain });
    windUniforms.uTime.value = this.elapsed;
    windUniforms.uWind.value = 1 + this.weather.cloud * 0.4 + this.weather.rain * 1.1;
    this.particles.update(dt);
    this.rain.update(dt, this.weather.rain, this.cameraRig.target, (x, z) => this.fishing.isFishableWater(x, z, 0.1));
    this.audio.update(this.shoreProximity(), { night, rain: this.weather.rain, ...this.world.zone.ambience });
    this.hud.setClock(this.time, this.weather);
  }

  handleMenuKeys() {
    const input = this.input;
    if (this.chat?.isOpen) return; // the chat box handles its own keys
    if (this.playerList) {
      if (input.isDown('Tab') && !this.panels.isOpen) this.playerList.show(this.online.server, this.onlinePlayers());
      else this.playerList.hide();
    }
    if (input.wasPressed('Escape')) {
      if (this.dialog.isOpen) {
        this.afterDialog = null; // Esc skips whatever the dialogue would lead to
        this.dialog.close();
      }
      else if (this.panels.isOpen) this.panels.close();
      else this.panels.open('pause');
      return;
    }
    if (this.dialog.isOpen) return;
    if (input.wasPressed('KeyB')) this.togglePanel('bucket');
    if (input.wasPressed('KeyJ')) this.togglePanel('journal');
    if (input.wasPressed('KeyR') && !this.panels.isOpen) {
      this.state.cycleBait();
      this.audio.play('equip');
    }
  }

  onlinePlayers() {
    const me = { name: this.profile.name, zone: this.world.zone.id, self: true };
    return [me, ...[...this.net.roster.values()].map((p) => ({ ...p }))];
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
      if (target.npc === 'marina') this.talkToMarina();
      else if (target.travel) this.panels.open('travel');
      else this.dialog.open(target.dialog);
    }
  }

  talkToMarina() {
    const greetings = [
      'Back again? Let\'s see what you caught!',
      'Oh, hello! The fish are biting today, I can feel it.',
      'Welcome back! Need some bait? Or... a hat?',
      'Ahoy! Bring me something shiny and rare, okay?',
    ];
    const pages = this.metMarina
      ? [greetings[Math.floor(Math.random() * greetings.length)]]
      : [
          'Oh! A new face! Welcome to Sunny Isle. I\'m Marina.',
          'I run this little shop. Bring me your fish and I\'ll pay you in coins. Bigger fish are worth more!',
          'With coins you can buy better rods, bait... and hats. Very important hats.',
        ];
    if (!this.metMarina) {
      this.metMarina = true;
      this.save.markDirty();
    }
    this.afterDialog = () => this.panels.open('shop');
    this.dialog.open({ name: 'Marina', pages });
  }

  // Connect a freshly built world to game-wide effects.
  hookWorld() {
    this.world.life.onSplash = (x, z) => {
      this.fishing.effects.ripple(x, z, 0.7);
      this.fishing.effects.splash(x, 0, z, 6, 0.5);
      this.audio.play('plop');
    };
  }

  // Fade out, swap the loaded zone, fade back in with the area banner.
  async travelTo(zoneId) {
    if (this.traveling || zoneId === this.world.zone.id) return;
    this.traveling = true;
    this.panels.close();
    this.audio.play('travel');
    this.fade.classList.add('visible');
    await new Promise((r) => setTimeout(r, 700));

    this.fishing.reset();
    this.world.dispose();
    this.world = new World(this.scene, ZONES_BY_ID[zoneId]);
    this.hookWorld();
    this.fishing.world = this.world;
    this.player.teleport(this.world, this.world.spawn);
    this.cameraRig.snapTo(this.player.position);
    this.save.markDirty();

    await new Promise((r) => setTimeout(r, 300));
    this.fade.classList.remove('visible');
    this.zoneBanner.show(this.world.zone);
    this.traveling = false;
  }

  // Footstep sound plus a little dust puff (bigger when running, none on the dock).
  onStep() {
    const surface = this.surfaceUnderPlayer();
    this.audio.play('step', { surface }, 0.12);
    if (surface === 'wood') return;
    const running = this.player.velocity.length() > PLAYER.walkSpeed * 1.1;
    if (surface === 'grass' && !running) return;
    const p = this.player.position;
    this.particles.emit(p.x, p.y + 0.05, p.z, {
      count: running ? 4 : 2,
      color: surface === 'sand' ? 0xf5e6c0 : 0xd8efb0,
      speed: 0.7,
      up: 0.5,
      gravity: -0.6,
      life: 0.5,
      size: 0.07,
      grow: 2,
    });
  }

  surfaceUnderPlayer() {
    const { x, z } = this.player.position;
    if (this.world.isOnDock(x, z)) return 'wood';
    return this.world.island.inlandDistance(x, z) < 4 ? 'sand' : 'grass';
  }

  // 1 at the water's edge (or on the dock), fading to 0 well inland.
  shoreProximity() {
    const { x, z } = this.player.position;
    if (this.world.isOnDock(x, z)) return 1;
    return clamp(1 - this.world.island.inlandDistance(x, z) / 14, 0, 1);
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
