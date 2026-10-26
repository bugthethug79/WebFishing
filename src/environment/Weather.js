// Weather: clear / cloudy / rain, blended smoothly. Which weather a stretch of time
// gets is decided by hashing the block number of the shared clock, so every
// player sees the same weather at the same moment with no server involved.

import { createRng } from '../core/math.js';

const STATES = {
  clear: { cloud: 0, rain: 0, icon: '', label: 'Clear' },
  cloudy: { cloud: 0.75, rain: 0, icon: '☁️', label: 'Cloudy' },
  rain: { cloud: 1, rain: 1, icon: '🌧️', label: 'Rain' },
};

const CHANCES = [
  ['clear', 0.55],
  ['cloudy', 0.25],
  ['rain', 0.2],
];

const BLOCK_HOURS = 4; // weather can change every 4 in-game hours (2 real minutes)
const SEED = 9137;

export function weatherForBlock(block) {
  let roll = createRng(block * 7919 + SEED)();
  return CHANCES.find(([, p]) => (roll -= p) <= 0)?.[0] ?? 'clear';
}

export class Weather {
  constructor() {
    this.block = null;
    this.state = 'clear';
    this.override = null; // { state, block }: debug override until the block ends
    this.cloud = 0;
    this.rain = 0;
  }

  get info() {
    return STATES[this.state];
  }

  // Counts as raining for fish once the rain has properly started.
  get isRaining() {
    return this.rain > 0.5;
  }

  // Debug: force a weather until the next block.
  set(state) {
    this.override = { state, block: this.block };
    this.state = state;
  }

  // totalHours: the shared clock (TimeOfDay.totalHours).
  update(dt, totalHours) {
    const first = this.block === null;
    this.block = Math.floor(totalHours / BLOCK_HOURS);
    if (this.override && this.override.block !== this.block) this.override = null;
    this.state = this.override?.state ?? weatherForBlock(this.block);

    const target = STATES[this.state];
    if (first) {
      // Arrive in the current weather instead of blending into it.
      this.cloud = target.cloud;
      this.rain = target.rain;
      return;
    }
    const k = Math.min(1, dt * 0.08); // roughly 12 seconds to blend
    this.cloud += (target.cloud - this.cloud) * k;
    this.rain += (target.rain - this.rain) * k;
  }
}
