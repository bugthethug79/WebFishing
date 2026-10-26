// A logged-in connection to a community server: handles login, reconnecting with the
// session token, and exposes the transport interface Multiplayer uses.

import { Emitter } from '../core/Emitter.js';
import { WebSocketClient } from './WebSocketClient.js';
import { PROTOCOL, normalizeAddress, CLOSE_REASONS } from './protocol.js';
import { rememberLogin } from './serverList.js';

// Ask a server for its name / player count without logging in.
export async function probeServer(address) {
  const url = normalizeAddress(address);
  if (!url) return { ok: false, error: 'Invalid address' };
  const client = new WebSocketClient(url);
  const t0 = performance.now();
  try {
    await client.connect(4000);
    client.send({ type: 'info' });
    const info = await client.next((m) => m.type === 'info', 4000);
    return { ok: true, info, ping: Math.round(performance.now() - t0) };
  } catch {
    return { ok: false, error: 'Offline' };
  } finally {
    client.close();
  }
}

export class OnlineSession extends Emitter {
  constructor(address) {
    super();
    this.address = address;
    this.url = normalizeAddress(address);
    this.client = null;
    this.welcome = null;
    this.token = null;
    this.passcode = '';
    this.leaving = false;
    this.handlers = [];
  }

  // ---- transport interface for Multiplayer ----
  get id() {
    return this.welcome?.id ?? null;
  }

  send(message) {
    this.client?.send(message);
  }

  onMessage(fn) {
    this.handlers.push(fn);
  }

  close() {
    this.leaving = true;
    this.client?.close();
  }

  // ---- login ----

  // fields: { mode: 'login' | 'register' | 'token', username, password, token, passcode, remember }
  async login(fields) {
    this.passcode = fields.passcode ?? '';
    const welcome = await this.authenticate(fields);
    // Always keep a token in memory for reconnecting; only store it if asked to.
    if (fields.remember && welcome.token) rememberLogin(this.address, welcome.name, welcome.token);
    return welcome;
  }

  async authenticate(fields) {
    const client = new WebSocketClient(this.url);
    try {
      await client.connect();
    } catch {
      throw { code: 'unreachable', message: 'Could not reach the server. Check the address, and that it uses wss:// if it isn\'t on this computer.' };
    }
    client.send({ type: 'auth', protocol: PROTOCOL, remember: true, ...fields, passcode: this.passcode });
    let reply;
    try {
      reply = await client.next((m) => m.type === 'welcome' || m.type === 'error');
    } catch {
      client.close();
      throw { code: 'timeout', message: 'The server did not answer.' };
    }
    if (reply.type === 'error') {
      client.close();
      throw reply;
    }
    this.attach(client, reply);
    return reply;
  }

  attach(client, welcome) {
    this.client = client;
    this.welcome = welcome;
    this.token = welcome.token ?? this.token;
    client.onMessage((m) => this.handlers.forEach((fn) => fn(m)));
    client.onClose((e) => this.onClosed(e));
  }

  async onClosed(e) {
    if (this.leaving) return;
    const reason = CLOSE_REASONS[e.code];
    // Kicked / banned / replaced: don't try to come back.
    if ([4001, 4002, 4003].includes(e.code)) {
      this.emit('ended', reason);
      return;
    }
    this.emit('disconnected', reason ?? 'Connection lost.');
    for (let attempt = 1; attempt <= 5 && !this.leaving; attempt++) {
      await new Promise((r) => setTimeout(r, attempt * 1500));
      try {
        const welcome = await this.authenticate({ mode: 'token', token: this.token });
        this.emit('reconnected', welcome);
        return;
      } catch (err) {
        if (err.code && !['unreachable', 'timeout'].includes(err.code)) break;
      }
    }
    if (!this.leaving) this.emit('ended', 'Could not reconnect to the server.');
  }
}

// Saves go to the server account instead of this browser (see SaveManager / storage.js).
export class ServerSaveBackend {
  constructor(session) {
    this.session = session;
  }

  async load() {
    return this.session.welcome?.save ?? null;
  }

  async save(data) {
    this.session.send({ type: 'save', data });
  }

  async clear() {}
}
