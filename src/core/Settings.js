// Player settings, saved to localStorage so they survive a refresh.

import { Emitter } from './Emitter.js';

const KEY = 'webfishing.settings.v1';

const DEFAULTS = {
  masterVolume: 0.8,
  musicVolume: 0.45,
  sfxVolume: 0.8,
  ambientVolume: 0.6,
  shadows: true,
  highResolution: true,
  showControls: true,
};

export class Settings extends Emitter {
  constructor() {
    super();
    this.values = { ...DEFAULTS, ...load() };
  }

  get(key) {
    return this.values[key];
  }

  set(key, value) {
    if (this.values[key] === value) return;
    this.values[key] = value;
    try {
      localStorage.setItem(KEY, JSON.stringify(this.values));
    } catch {
      // Storage can be unavailable (private mode); settings just won't persist.
    }
    this.emit('change', { key, value });
  }
}

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? {};
  } catch {
    return {};
  }
}
