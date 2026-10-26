// Where saves live. The game only talks to this interface, so a server-backed
// version (for multiplayer accounts) can replace LocalStorageBackend later.
//
// interface SaveBackend {
//   load(): Promise<object | null>
//   save(data: object): Promise<void>
//   clear(): Promise<void>
// }

export class LocalStorageBackend {
  constructor(key = 'webfishing.save') {
    this.key = key;
  }

  async load() {
    try {
      const raw = localStorage.getItem(this.key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null; // unavailable or corrupt: start fresh rather than crash
    }
  }

  async save(data) {
    try {
      localStorage.setItem(this.key, JSON.stringify(data));
    } catch (e) {
      console.warn('Could not save game', e);
    }
  }

  async clear() {
    try {
      localStorage.removeItem(this.key);
    } catch {
      // nothing to clear
    }
  }
}
