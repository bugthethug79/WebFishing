// Multiplayer session: sends our state ~10x a second, keeps a RemotePlayer for
// everyone else, and relays fun events (catches). Transport-agnostic: give it any
// client with { id, send, onMessage, close } (see BroadcastClient).
//
// Messages (every message from another player carries `from`, their connection id):
//   { type: 'hello' }                  tab transport: someone joined, everyone replies with state
//   { type: 'state', ...snapshot }     where a player is and what they're doing
//   { type: 'catch', name, fish, rarity, size }
//   { type: 'chat', name, text } / { type: 'chat', system: true, text }
//   { type: 'join' | 'leave', name }   server transport: authoritative presence
//   { type: 'zone', name, zone }       server transport: someone changed zone
//   { type: 'bye' }                    tab transport: someone left

import { RemotePlayer } from './RemotePlayer.js';

const SEND_INTERVAL = 0.1;
const TIMEOUT_MS = 5000;

export class Multiplayer {
  // getLocal(): our current snapshot (see Game.localSnapshot). onCatch(msg): show an announcement.
  // onChat(msg, peer): a chat line arrived. server: true when a server reports join/leave
  // (then silent peers aren't timed out). roster: initial [{ id, name, zone }] from the server.
  constructor(scene, hudRoot, client, { getLocal, onCatch, onPeersChanged, onChat, server = false, roster = [] }) {
    this.scene = scene;
    this.client = client;
    this.getLocal = getLocal;
    this.onCatch = onCatch;
    this.onPeersChanged = onPeersChanged;
    this.onChat = onChat;
    this.server = server;
    this.peers = new Map();
    // Everyone online (even in other zones, whom we never get positions for).
    this.roster = new Map(roster.map((p) => [p.id, { name: p.name, zone: p.zone }]));
    this.sendTimer = 0;
    this.tagRoot = document.createElement('div');
    this.tagRoot.className = 'name-tags';
    hudRoot.appendChild(this.tagRoot);

    client.onMessage((msg) => this.receive(msg));
    if (!server) client.send({ type: 'hello' });
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
        this.roster.set(msg.from, { name: msg.name, zone: msg.zone });
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
      case 'chat':
        this.onChat?.(msg, this.peers.get(msg.from));
        break;
      case 'join':
        this.roster.set(msg.from, { name: msg.name, zone: null });
        break;
      case 'zone': {
        const r = this.roster.get(msg.from);
        if (r) r.zone = msg.zone;
        const peer = this.peers.get(msg.from);
        if (peer) peer.zone = msg.zone;
        break;
      }
      case 'leave':
      case 'bye':
        this.roster.delete(msg.from);
        this.remove(msg.from);
        break;
    }
  }

  // Drop every remote player (e.g. after reconnecting; the server resends everyone).
  clear() {
    for (const id of [...this.peers.keys()]) this.remove(id, true);
  }

  remove(id, quiet = false) {
    const peer = this.peers.get(id);
    if (!peer) return;
    const name = peer.target?.name;
    peer.dispose();
    this.peers.delete(id);
    if (!quiet) this.onPeersChanged?.(this.peers.size, name, 'left');
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
      // With a server, presence comes from join/leave; without one, silence means gone.
      if (!this.server && now - peer.lastSeen > TIMEOUT_MS) {
        this.remove(id);
        continue;
      }
      peer.update(dt, camera, peer.zone === zoneId);
    }
  }
}
