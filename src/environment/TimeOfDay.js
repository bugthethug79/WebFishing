// The in-game clock. One in-game hour passes every HOUR_SECONDS real seconds.

import { smoothstep } from '../core/math.js';

export const HOUR_SECONDS = 30; // a full day takes 12 minutes

export class TimeOfDay {
  constructor(startHour = 9) {
    this.hours = startHour;
  }

  update(dt) {
    this.hours = (this.hours + dt / HOUR_SECONDS) % 24;
  }

  set(hours) {
    this.hours = ((hours % 24) + 24) % 24;
  }

  // 0 in daylight, 1 in full night, smooth through dusk and dawn.
  get night() {
    const h = this.hours;
    return Math.max(1 - smoothstep(4.8, 6.8, h), smoothstep(18.6, 20.8, h));
  }

  // For fish that only bite at night.
  get isNight() {
    return this.hours >= 19.5 || this.hours < 5.5;
  }

  get icon() {
    const h = this.hours;
    if (h >= 5.5 && h < 7.5) return '🌅';
    if (h >= 7.5 && h < 17.5) return '☀️';
    if (h >= 17.5 && h < 19.5) return '🌇';
    return '🌙';
  }

  get label() {
    const h = Math.floor(this.hours);
    const m = Math.floor((this.hours - h) * 6) * 10; // 10-minute steps keep the clock calm
    const suffix = h < 12 ? 'AM' : 'PM';
    return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${suffix}`;
  }
}
