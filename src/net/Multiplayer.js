// Multiplayer session: sends our state ~10x a second, keeps a RemotePlayer for
// everyone else, and relays fun events (catches). Transport-agnostic: give it any
// client with { id, send, onMessage, close } (see BroadcastClient).
//
// Messages:
//   { type: 'hello' }                  someone joined; everyone replies with their state
//   { type: 'state', ...snapshot }     where a player is and what they're doing
//   { type: 'catch', name, fish, rarity, size }
//   { type: 'bye' }                    someone left

import { RemotePlayer } from './RemotePlayer.js';

const SEND_INTERVAL = 0.1;
const TIMEOUT_MS = 5000;

export class Multiplayer {
  // getLocal(): our current snapshot (see Game.localSnapshot). onCatch(msg): show an announcement.
  constructor(scene, hudRoot, client, { getLocal, onCatch, onPeersChanged }) {
    this.scene = scene;
    this.client = client;
    this.getLocal = getLocal;
    this.onCatch = onCatch;
    this.onPeersChanged = onPeersChanged;
    this.peers = new Map();
    this.sendTimer = 0;
    this.tagRoot = document.createElement('div');
    this.tagRoot.className = 'name-tags';
    hudRoot.appendChild(this.tagRoot);

    client.onMessage((msg) => this.receive(msg));
    client.send({ type: 'hello' });
  }

  get count() {
    return this.peers.size;
  }

  receive(msg) {
    switch (msg.type) {
      case 'hello':
        this.sendState();
        break;
      case 'state': {
        let peer = this.peers.get(msg.from);
        if (!peer) {
          peer = new RemotePlayer(this.scene, this.tagRoot, msg.from);
          this.peers.set(msg.from, peer);
          this.onPeersChanged?.(this.peers.size, msg.name, 'joined');
        }
        peer.receive(msg);
        break;
      }
      case 'catch':
        this.onCatch?.(msg);
        break;
      case 'bye':
        this.remove(msg.from);
        break;
    }
  }

  remove(id) {
    const peer = this.peers.get(id);
    if (!peer) return;
    const name = peer.target?.name;
    peer.dispose();
    this.peers.delete(id);
    this.onPeersChanged?.(this.peers.size, name, 'left');
  }

  sendState() {
    this.client.send({ type: 'state', ...this.getLocal() });
  }

  announceCatch(c, name) {
    this.client.send({ type: 'catch', name, fish: c.species.name, rarity: c.rarity.label, size: c.size });
  }

  update(dt, camera, zoneId) {
    this.sendTimer -= dt;
    if (this.sendTimer <= 0) {
      this.sendTimer = SEND_INTERVAL;
      this.sendState();
    }
    const now = performance.now();
    for (const [id, peer] of this.peers) {
      if (now - peer.lastSeen > TIMEOUT_MS) {
        this.remove(id);
        continue;
      }
      peer.update(dt, camera, peer.zone === zoneId);
    }
  }
}
