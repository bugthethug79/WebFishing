// The core fishing loop as a small state machine:
//
//   idle -> charging -> casting -> waiting (nibbles) -> bite -> reeling -> caught -> idle
//                          |            |                 |        |
//                          +------------+--- retrieving <-+--------+   (missed / escaped / cancelled)

import * as THREE from 'three';
import { WORLD } from '../config.js';
import { clamp, damp, lerp } from '../core/math.js';
import { groundHeight } from '../world/island.js';
import { waveHeight } from '../world/water.js';
import { createBobber } from './Bobber.js';
import { FishingLine } from './FishingLine.js';
import { Effects } from './Effects.js';
import { rollFish } from './fishTable.js';
import { createFishModel } from './fishModel.js';

const TUNING = {
  minCast: 2.5,
  maxCast: 12,
  chargeSpeed: 1.1, // power meter cycles per second (it ping-pongs)
  waitTime: [2.5, 7], // seconds before a bite
  biteWindow: 1.1, // seconds to hook the fish
  reel: {
    startProgress: 0.2,
    gain: 0.2, // progress per second while reeling
    slip: 0.05, // progress lost per second while not reeling (scaled by strength)
    tensionUp: 0.38,
    tensionThrash: 0.9,
    tensionDown: 0.7,
    dangerZone: 0.85, // no progress above this tension
    snapTime: 0.6, // seconds at max tension before the line snaps
  },
};

const BOBBER_TOP = 0.28; // where the line attaches above the bobber's origin

export class FishingSystem {
  constructor(scene, world, player, ui) {
    this.scene = scene;
    this.world = world;
    this.player = player;
    this.ui = ui;

    this.bobber = createBobber();
    scene.add(this.bobber);
    this.bobber.position.copy(player.getRodTip()).y -= 0.5;
    this.line = new FishingLine(scene);
    this.effects = new Effects(scene);

    this.state = 'idle';
    this.stateTime = 0;
    this.time = 0;

    this.power = 0;
    this.powerDir = 1;
    this.castFrom = new THREE.Vector3();
    this.castTo = new THREE.Vector3();
    this.hookPoint = new THREE.Vector3();
    this.retrieveFrom = new THREE.Vector3();
    this.tip = new THREE.Vector3();
    this.dip = 0;
    this.dipTarget = 0;

    this.catches = []; // Milestone 3 moves this into a real inventory.
    this.onCatch = null;

    this._tmp = new THREE.Vector3();
    this._screen = new THREE.Vector3();
  }

  get isFishing() {
    return this.state !== 'idle';
  }

  setState(state) {
    this.state = state;
    this.stateTime = 0;
  }

  update(dt, input, cameraRig) {
    this.time += dt;
    this.stateTime += dt;
    this.player.getRodTip(this.tip);

    this[`update_${this.state}`](dt, input, cameraRig);

    this.applyPlayerControl();
    this.updateLine();
    this.effects.update(dt);
    this.updateAnchor(cameraRig.camera);
  }

  // ---------- states ----------

  update_idle(dt, input) {
    this.player.pose = 'idle';
    this.dangleBobber(dt);
    if (input.actionPressed) {
      this.power = 0;
      this.powerDir = 1;
      this.setState('charging');
    }
  }

  update_charging(dt, input) {
    this.player.pose = 'charge';
    this.dangleBobber(dt);

    this.power += this.powerDir * TUNING.chargeSpeed * 2 * dt;
    if (this.power >= 1) {
      this.power = 1;
      this.powerDir = -1;
    } else if (this.power <= 0) {
      this.power = 0;
      this.powerDir = 1;
    }
    this.ui.setPower(this.power);

    if (input.actionReleased) {
      this.ui.setPower(null);
      this.startCast();
    }
  }

  startCast() {
    const { x: fx, z: fz } = this.player.forward;
    const dist = lerp(TUNING.minCast, TUNING.maxCast, this.power);
    const p = this.player.position;
    const tx = p.x + fx * dist;
    const tz = p.z + fz * dist;

    this.castValid = this.isFishableWater(tx, tz);
    const ty = this.castValid ? WORLD.waterLevel : (this.world.getWalkHeight(tx, tz) ?? groundHeight(tx, tz));
    this.castFrom.copy(this.bobber.position);
    this.castTo.set(tx, ty, tz);
    this.flightTime = 0.45 + this.power * 0.35;
    this.arcHeight = 1.5 + this.power * 2.5;
    this.setState('casting');
  }

  update_casting() {
    this.player.pose = this.stateTime < 0.25 ? 'cast' : 'hold';
    const t = Math.min(1, this.stateTime / this.flightTime);
    this.bobber.position.lerpVectors(this.castFrom, this.castTo, t);
    this.bobber.position.y += this.arcHeight * 4 * t * (1 - t);
    this.bobber.rotation.x = t * Math.PI * 2;

    if (t < 1) return;
    this.bobber.rotation.x = 0;
    const { x, z } = this.castTo;
    if (this.castValid) {
      this.effects.splash(x, WORLD.waterLevel, z, 10, 0.8);
      this.effects.ripple(x, z, 1.2);
      this.startWaiting();
    } else {
      this.ui.toast('Cast into the water!');
      this.startRetrieve(0.5);
    }
  }

  startWaiting() {
    this.biteAt = lerp(TUNING.waitTime[0], TUNING.waitTime[1], Math.random());
    // A few nibbles before the real bite keep you watching the bobber.
    const count = Math.floor(Math.random() * 4);
    this.nibbles = Array.from({ length: count }, () => lerp(0.8, this.biteAt - 0.5, Math.random())).sort((a, b) => a - b);
    this.nibbleTimer = 0;
    this.setState('waiting');
  }

  update_waiting(dt, input) {
    this.player.pose = 'hold';

    if (this.nibbles.length && this.stateTime >= this.nibbles[0]) {
      this.nibbles.shift();
      this.nibbleTimer = 0.3;
      this.effects.ripple(this.bobber.position.x, this.bobber.position.z, 0.6, 0.8);
    }
    this.nibbleTimer -= dt;
    this.dipTarget = this.nibbleTimer > 0 ? -0.1 : 0;
    this.floatBobber(dt, this.castTo.x, this.castTo.z);

    if (input.actionPressed || this.moveRequested(input)) {
      if (this.nibbleTimer > 0) this.ui.toast('Too early! It swam off.');
      this.startRetrieve();
      return;
    }

    if (this.stateTime >= this.biteAt) {
      const { x, z } = this.castTo;
      this.effects.splash(x, WORLD.waterLevel, z, 8, 0.7);
      this.effects.ripple(x, z, 1.6);
      this.ui.setBite(true);
      this.setState('bite');
    }
  }

  update_bite(dt, input) {
    this.player.pose = 'hold';
    this.dipTarget = -0.28 + Math.sin(this.stateTime * 20) * 0.06;
    this.floatBobber(dt, this.castTo.x, this.castTo.z);

    if (input.actionPressed) {
      this.ui.setBite(false);
      this.startReeling();
    } else if (this.stateTime >= TUNING.biteWindow || this.moveRequested(input)) {
      this.ui.setBite(false);
      this.ui.toast('It got away...');
      this.startRetrieve();
    }
  }

  startReeling() {
    const { x, z } = this.castTo;
    const depth = Math.max(0, WORLD.waterLevel - groundHeight(x, z));
    this.catch = rollFish(Math.random, clamp((depth - 0.5) / 2.5, 0, 1));
    this.hookPoint.set(x, WORLD.waterLevel, z);
    this.reel = {
      progress: TUNING.reel.startProgress,
      tension: 0.2,
      snap: 0,
      thrashing: false,
      nextThrash: lerp(0.8, 1.8, Math.random()),
      splashTimer: 0,
    };
    this.effects.splash(x, WORLD.waterLevel, z, 12, 1);
    this.setState('reeling');
  }

  update_reeling(dt, input) {
    const R = TUNING.reel;
    const r = this.reel;
    const strength = this.catch.species.strength;
    const reeling = input.actionDown;
    this.player.pose = reeling ? 'reel' : 'hold';

    // The fish alternates between resting and thrashing.
    r.nextThrash -= dt;
    if (r.nextThrash <= 0) {
      r.thrashing = !r.thrashing;
      r.nextThrash = r.thrashing ? lerp(0.5, 0.8 + strength, Math.random()) : lerp(1.2, 3.2 - strength * 1.5, Math.random());
    }

    if (reeling) {
      r.tension += (R.tensionUp + (r.thrashing ? R.tensionThrash * strength : 0)) * dt;
      if (r.tension < R.dangerZone) r.progress += R.gain * (1 - strength * 0.5) * dt;
    } else {
      r.tension -= R.tensionDown * dt;
      r.progress -= R.slip * (0.5 + strength) * dt;
    }
    if (r.thrashing && !reeling) r.tension += 0.15 * strength * dt; // a little tug even when slack
    r.tension = clamp(r.tension, 0, 1);

    r.snap = r.tension >= 1 ? r.snap + dt : Math.max(0, r.snap - dt * 2);

    this.ui.setReel({ progress: clamp(r.progress, 0, 1), tension: r.tension, thrashing: r.thrashing });

    // Bobber is dragged toward the player as progress builds, wiggling when the fish fights.
    const p = this.player.position;
    const f = this.player.forward;
    const nearX = p.x + f.x * 1.5;
    const nearZ = p.z + f.z * 1.5;
    const k = clamp(r.progress, 0, 1) * 0.8;
    let bx = lerp(this.hookPoint.x, nearX, k);
    let bz = lerp(this.hookPoint.z, nearZ, k);
    if (r.thrashing) {
      const wiggle = Math.sin(this.time * 14) * 0.35;
      bx += -f.z * wiggle;
      bz += f.x * wiggle;
    }
    if (this.isFishableWater(bx, bz, 0.05)) this.castTo.set(bx, WORLD.waterLevel, bz);
    this.dipTarget = r.thrashing ? -0.22 : -0.12;
    this.floatBobber(dt, this.castTo.x, this.castTo.z);

    r.splashTimer -= dt;
    if (r.thrashing && r.splashTimer <= 0) {
      r.splashTimer = 0.22;
      this.effects.splash(this.castTo.x, WORLD.waterLevel, this.castTo.z, 4, 0.6);
      this.effects.ripple(this.castTo.x, this.castTo.z, 0.8, 0.7);
    }

    if (r.progress >= 1) {
      this.ui.setReel(null);
      this.startCaught();
    } else if (r.progress <= 0 || r.snap >= R.snapTime) {
      this.ui.setReel(null);
      this.ui.toast(r.snap >= R.snapTime ? 'Snap! The line broke.' : 'It got away...');
      this.startRetrieve();
    }
  }

  startCaught() {
    const { x, z } = this.castTo;
    this.effects.splash(x, WORLD.waterLevel, z, 16, 1.2);
    this.effects.ripple(x, z, 1.8);

    this.fish = createFishModel(this.catch.species, this.catch.size);
    this.scene.add(this.fish.object);
    this.fishFrom = new THREE.Vector3(x, WORLD.waterLevel, z);
    this.cardShown = false;
    this.catches.push(this.catch);
    this.onCatch?.(this.catch);
    this.setState('caught');
  }

  update_caught(dt, input, cameraRig) {
    this.player.pose = 'cheer';
    const above = this._tmp.copy(this.player.position);
    above.y += 2.9;

    // Fish leaps out of the water and lands above the player's head.
    const t = Math.min(1, this.stateTime / 0.7);
    const fish = this.fish.object;
    fish.position.lerpVectors(this.fishFrom, above, t);
    fish.position.y += 2.5 * 4 * t * (1 - t);
    fish.rotation.set(0, cameraRig.yaw, Math.sin(this.time * 10) * 0.3 * (1 - t * 0.6));
    this.fish.tail.rotation.y = Math.sin(this.time * 16) * 0.5;

    // Bobber comes home with it.
    this.bobber.position.lerp(this._tmp.copy(this.tip).setY(this.tip.y - 0.5), damp(10, dt));

    if (t >= 1 && !this.cardShown) {
      this.cardShown = true;
      this.ui.showCatch(this.catch);
    }
    const canDismiss = this.cardShown && this.stateTime > 1.2;
    if ((canDismiss && input.actionPressed) || this.stateTime > 6) {
      this.ui.hideCatch();
      this.scene.remove(this.fish.object);
      this.fish = null;
      this.setState('idle');
    }
  }

  startRetrieve(delay = 0) {
    this.retrieveDelay = delay;
    this.retrieveFrom.copy(this.bobber.position);
    this.dipTarget = 0;
    this.setState('retrieving');
  }

  update_retrieving() {
    this.player.pose = 'hold';
    const t = clamp((this.stateTime - this.retrieveDelay) / 0.35, 0, 1);
    const home = this._tmp.copy(this.tip);
    home.y -= 0.5;
    this.bobber.position.lerpVectors(this.retrieveFrom, home, t);
    this.bobber.position.y += Math.sin(t * Math.PI) * 0.8;
    if (t >= 1) this.setState('idle');
  }

  // ---------- helpers ----------

  isFishableWater(x, z, minDepth = 0.25) {
    return groundHeight(x, z) < WORLD.waterLevel - minDepth && !this.world.isOnDock(x, z);
  }

  moveRequested(input) {
    const a = input.getMoveAxis();
    return a.x !== 0 || a.y !== 0;
  }

  dangleBobber(dt) {
    // Hang under the rod tip with a little lag so it swings as you walk.
    const target = this._tmp.copy(this.tip);
    target.y -= 0.5;
    this.bobber.position.lerp(target, damp(18, dt));
    this.bobber.rotation.set(0, 0, 0);
  }

  floatBobber(dt, x, z) {
    this.dip = lerp(this.dip, this.dipTarget, damp(14, dt));
    const t = this.time;
    this.bobber.position.set(x, WORLD.waterLevel + waveHeight(x, z, t) + this.dip, z);
    this.bobber.rotation.z = Math.sin(t * 2.1) * 0.12;
  }

  applyPlayerControl() {
    this.player.canMove = this.state === 'idle';
    this.player.canTurn = this.state === 'idle' || this.state === 'charging';
  }

  updateLine() {
    const end = this._tmp.copy(this.bobber.position);
    end.y += BOBBER_TOP;
    let slack = 0;
    if (this.state === 'casting') slack = 0.2;
    else if (this.state === 'waiting') slack = 1;
    else if (this.state === 'bite') slack = 0.3;
    else if (this.state === 'reeling') slack = 1 - this.reel.tension;
    else if (this.state === 'retrieving') slack = 0.4;
    this.line.update(this.tip, end, slack);
  }

  updateAnchor(camera) {
    const s = this._screen.copy(this.player.position);
    s.y += 2.3;
    s.project(camera);
    this.ui.setAnchor((s.x * 0.5 + 0.5) * window.innerWidth, (-s.y * 0.5 + 0.5) * window.innerHeight);
  }

  // Where the camera should look: drift toward the bobber while it's out.
  getCameraFocus(out) {
    out.copy(this.player.position);
    if (['casting', 'waiting', 'bite', 'reeling'].includes(this.state)) {
      out.lerp(this.bobber.position, 0.3);
      out.y = this.player.position.y;
    }
    return out;
  }
}
