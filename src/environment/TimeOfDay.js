// The in-game clock, derived from real-world time so every player (and every
// browser tab) sees the same time of day without needing a server.
// One in-game hour passes every HOUR_SECONDS real seconds.

import { smoothstep } from '../core/math.js';

export const HOUR_SECONDS = 30; // a full day takes 12 minutes

export class TimeOfDay {
  constructor() {
    // Local offset in hours: 0 keeps you on the shared clock. Debug jumps (set) change it;
    // a multiplayer server could also hand one out.
    this.offset = 0;
  }

  // Hours since the shared epoch (keeps increasing; used for weather blocks).
  get totalHours() {
    return Date.now() / 1000 / HOUR_SECONDS + this.offset;
  }

  get hours() {
    return ((this.totalHours % 24) + 24) % 24;
  }

  // Kept for the game loop's sake; the clock reads Date.now() directly.
  update() {}

  // Debug: jump this browser's clock to a time of day.
  set(hours) {
    this.offset += hours - this.hours;
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
    const hours = this.hours;
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 6) * 10; // 10-minute steps keep the clock calm
    const suffix = h < 12 ? 'AM' : 'PM';
    return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${suffix}`;
  }
}
