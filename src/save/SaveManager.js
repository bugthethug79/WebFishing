// Collects the game's persistent state into one versioned save object, writes it
// through a storage backend, and autosaves when things change.

import { Emitter } from '../core/Emitter.js';

export const SAVE_VERSION = 1;

// Upgrade older saves step by step. Add a case whenever SAVE_VERSION goes up.
function migrate(data) {
  if (!data || typeof data !== 'object') return null;
  const save = structuredClone(data);
  // e.g. if (save.version === 1) { ...; save.version = 2; }
  return save.version === SAVE_VERSION ? save : null;
}

// Reads and upgrades a save from a backend (null if there isn't a usable one).
export async function loadSave(backend) {
  return migrate(await backend.load());
}

// Encode/decode a save as a copy-pasteable code (base64 of the JSON, unicode-safe).
export function encodeSave(data) {
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

export function decodeSave(code) {
  try {
    const bin = atob(code.trim());
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return migrate(JSON.parse(new TextDecoder().decode(bytes)));
  } catch {
    return null;
  }
}

export class SaveManager extends Emitter {
  // parts: { profile, state, inventory, journal, getPlayer(), getFlags() } from the game.
  constructor(backend, parts) {
    super();
    this.backend = backend;
    this.parts = parts;
    this.dirty = false;
    this.timer = null;
    this.enabled = false; // switched on once the player has started (and the save is loaded)

    for (const store of [parts.state, parts.inventory, parts.journal]) store.on('change', () => this.markDirty());

    // Never lose progress when the tab is closed or hidden.
    const flush = () => this.enabled && this.save();
    document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush());
    window.addEventListener('pagehide', flush);
    // Also catch slow changes like walking around.
    setInterval(() => this.enabled && this.save(), 30000);
  }

  collect() {
    const p = this.parts;
    return {
      version: SAVE_VERSION,
      savedAt: Date.now(),
      profile: p.profile.toJSON(),
      player: p.getPlayer(),
      state: p.state.toJSON(),
      inventory: p.inventory.toJSON(),
      journal: p.journal.toJSON(),
      flags: p.getFlags(),
    };
  }

  // Applies the stores; the game handles player position / zone itself.
  apply(data) {
    const p = this.parts;
    p.profile.fromJSON(data.profile);
    p.state.fromJSON(data.state);
    p.inventory.fromJSON(data.inventory);
    p.journal.fromJSON(data.journal);
  }

  // Changes are batched: save a couple of seconds after the last one.
  markDirty() {
    if (!this.enabled) return;
    this.dirty = true;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.save(), 1500);
  }

  async save() {
    clearTimeout(this.timer);
    this.dirty = false;
    await this.backend.save(this.collect());
    this.emit('saved');
  }

  async clear() {
    this.enabled = false;
    clearTimeout(this.timer);
    await this.backend.clear();
  }
}
