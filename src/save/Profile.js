// Who the player is: a stable id and a display name. Multiplayer uses these for
// name tags and (later) accounts; single player just shows the name.

const NAME_MAX = 16;

function newId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function cleanName(name) {
  const trimmed = String(name ?? '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
  return trimmed || 'Angler';
}

export class Profile {
  constructor() {
    this.id = newId();
    this.name = 'Angler';
    this.isNew = true; // no save found yet
  }

  toJSON() {
    return { id: this.id, name: this.name };
  }

  fromJSON(data) {
    if (!data) return;
    this.id = data.id || this.id;
    this.name = cleanName(data.name);
    this.isNew = false;
  }
}

export { NAME_MAX };
