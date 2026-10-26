#!/usr/bin/env node
// WebFishing community server.
//
// One file, no dependencies: download the `server/` folder and run `node server.js`.
// Needs Node.js 18 or newer. Settings live in config.json (created on first run).
// Accounts and their saves are stored in data/accounts.json.
//
// Players connect from the game's Multiplayer menu using this server's address.
// See README.md in this folder for hosting, HTTPS/wss and configuration.

'use strict';

const http = require('node:http');
const https = require('node:https');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const { spawn } = require('node:child_process');

const VERSION = '1.0.0';
const PROTOCOL = 1; // bump when messages change incompatibly; the game checks it

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

// WEBFISHING_CONFIG lets you keep several configs (or point tests at a temporary one).
const CONFIG_PATH = process.env.WEBFISHING_CONFIG ? path.resolve(process.env.WEBFISHING_CONFIG) : path.join(__dirname, 'config.json');

const DEFAULT_CONFIG = {
  name: 'My WebFishing Server',
  motd: 'Welcome! Be kind and have fun fishing.',
  port: 8787,
  host: '0.0.0.0',
  public: true,
  passcode: '',
  maxPlayers: 16,
  allowRegistration: true,
  admins: [],
  allowedOrigins: [],
  tls: { cert: '', key: '' },
  // Cloudflare Tunnel: a secure wss:// address without certificates or port forwarding.
  // enabled + no token: free random *.trycloudflare.com address (changes on restart).
  // token: a permanent tunnel on your own domain (see README).
  // protocol: "http2" (TCP, works on most hosts) | "quic" (UDP) | "auto".
  tunnel: { enabled: false, token: '', protocol: 'http2' },
  chat: { enabled: true, maxLength: 200, messagesPerWindow: 5, windowSeconds: 5, blockedWords: [] },
  dataDir: 'data',
};

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2) + '\n');
    log(`Created config.json with default settings. Edit it and restart to customise your server.`);
  }
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch (e) {
    fatal(`config.json is not valid JSON: ${e.message}`);
  }
  const config = { ...DEFAULT_CONFIG, ...raw };
  config.chat = { ...DEFAULT_CONFIG.chat, ...(raw.chat ?? {}) };
  config.tls = { ...DEFAULT_CONFIG.tls, ...(raw.tls ?? {}) };
  config.tunnel = { ...DEFAULT_CONFIG.tunnel, ...(raw.tunnel ?? {}) };
  // Panel hosts (Pterodactyl / bot-hosting.net) and PaaS hosts pick the port for you.
  const envPort = Number(process.env.SERVER_PORT || process.env.PORT);
  if (envPort) config.port = envPort;
  if (!config.public && !String(config.passcode).trim()) {
    fatal('This server is set to private ("public": false) but has no "passcode". Set one in config.json.');
  }
  config.admins = (config.admins ?? []).map((n) => String(n).toLowerCase());
  return config;
}

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

function log(...args) {
  const t = new Date().toTimeString().slice(0, 8);
  console.log(`[${t}]`, ...args);
}

function fatal(message) {
  console.error(`\n  ✖ ${message}\n`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Account storage (a JSON file, written atomically and debounced)
// ---------------------------------------------------------------------------

const TOKEN_DAYS = 30;
const MAX_SAVE_BYTES = 128 * 1024;

class Store {
  constructor(dir) {
    this.dir = path.resolve(__dirname, dir);
    this.file = path.join(this.dir, 'accounts.json');
    fs.mkdirSync(this.dir, { recursive: true });
    this.data = { users: {}, tokens: {} };
    if (fs.existsSync(this.file)) {
      try {
        this.data = { users: {}, tokens: {}, ...JSON.parse(fs.readFileSync(this.file, 'utf8')) };
      } catch (e) {
        fatal(`${this.file} is corrupt (${e.message}). Restore a backup or delete it to start fresh.`);
      }
    }
    this.timer = null;
  }

  user(name) {
    return this.data.users[name.toLowerCase()] ?? null;
  }

  createUser(name, password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const user = {
      name,
      salt,
      hash: hashPassword(password, salt),
      createdAt: Date.now(),
      lastLogin: Date.now(),
      banned: false,
      save: null,
    };
    this.data.users[name.toLowerCase()] = user;
    this.markDirty();
    return user;
  }

  // Tokens are stored hashed, so a leaked accounts.json can't be used to log in.
  issueToken(user) {
    const token = crypto.randomBytes(24).toString('base64url');
    this.data.tokens[sha256(token)] = { user: user.name.toLowerCase(), expires: Date.now() + TOKEN_DAYS * 864e5 };
    this.markDirty();
    return token;
  }

  userForToken(token) {
    const entry = this.data.tokens[sha256(String(token))];
    if (!entry || entry.expires < Date.now()) return null;
    return this.data.users[entry.user] ?? null;
  }

  revokeTokens(user) {
    for (const [k, v] of Object.entries(this.data.tokens)) if (v.user === user.name.toLowerCase()) delete this.data.tokens[k];
    this.markDirty();
  }

  markDirty() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), 1000);
  }

  flush() {
    clearTimeout(this.timer);
    const now = Date.now();
    for (const [k, v] of Object.entries(this.data.tokens)) if (v.expires < now) delete this.data.tokens[k];
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data));
    fs.renameSync(tmp, this.file);
  }
}

function hashPassword(password, salt) {
  return crypto.scryptSync(String(password), salt, 64).toString('hex');
}

function sha256(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

// ---------------------------------------------------------------------------
// Minimal WebSocket (RFC 6455) server side: text frames, ping/pong, close.
// ---------------------------------------------------------------------------

const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const MAX_PAYLOAD = 256 * 1024;

class WsConnection {
  constructor(socket) {
    this.socket = socket;
    this.buffer = Buffer.alloc(0);
    this.fragments = null;
    this.alive = true;
    this.closed = false;
    this.onmessage = null;
    this.onclose = null;
    socket.setNoDelay(true);
    socket.on('data', (chunk) => {
      this.buffer = this.buffer.length ? Buffer.concat([this.buffer, chunk]) : chunk;
      try {
        while (this.readFrame());
      } catch {
        this.fail(1002);
      }
    });
    socket.on('close', () => this.finish());
    socket.on('error', () => this.finish());
  }

  readFrame() {
    const b = this.buffer;
    if (b.length < 2) return false;
    const fin = (b[0] & 0x80) !== 0;
    const opcode = b[0] & 0x0f;
    const masked = (b[1] & 0x80) !== 0;
    let len = b[1] & 0x7f;
    let offset = 2;
    if (len === 126) {
      if (b.length < 4) return false;
      len = b.readUInt16BE(2);
      offset = 4;
    } else if (len === 127) {
      if (b.length < 10) return false;
      const big = b.readBigUInt64BE(2);
      if (big > BigInt(MAX_PAYLOAD)) return this.fail(1009);
      len = Number(big);
      offset = 10;
    }
    if (len > MAX_PAYLOAD) return this.fail(1009);
    if (!masked) return this.fail(1002); // browsers always mask; anything else isn't a real client
    if (b.length < offset + 4 + len) return false;

    const mask = b.subarray(offset, offset + 4);
    offset += 4;
    const payload = Buffer.from(b.subarray(offset, offset + len));
    for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i & 3];
    this.buffer = b.subarray(offset + len);

    switch (opcode) {
      case 0x0: // continuation
        if (!this.fragments) return this.fail(1002);
        this.fragments.push(payload);
        if (this.fragments.reduce((n, f) => n + f.length, 0) > MAX_PAYLOAD) return this.fail(1009);
        if (fin) {
          const text = Buffer.concat(this.fragments).toString('utf8');
          this.fragments = null;
          this.onmessage?.(text);
        }
        break;
      case 0x1: // text
        if (fin) this.onmessage?.(payload.toString('utf8'));
        else this.fragments = [payload];
        break;
      case 0x2: // binary: not used by the game
        return this.fail(1003);
      case 0x8: // close
        this.close(payload.length >= 2 ? payload.readUInt16BE(0) : 1000);
        return false;
      case 0x9: // ping
        this.writeFrame(0xa, payload);
        break;
      case 0xa: // pong
        this.alive = true;
        break;
      default:
        return this.fail(1002);
    }
    return true;
  }

  writeFrame(opcode, payload) {
    if (this.closed) return;
    const len = payload.length;
    let header;
    if (len < 126) {
      header = Buffer.from([0x80 | opcode, len]);
    } else if (len < 65536) {
      header = Buffer.alloc(4);
      header[0] = 0x80 | opcode;
      header[1] = 126;
      header.writeUInt16BE(len, 2);
    } else {
      header = Buffer.alloc(10);
      header[0] = 0x80 | opcode;
      header[1] = 127;
      header.writeBigUInt64BE(BigInt(len), 2);
    }
    this.socket.write(Buffer.concat([header, payload]));
  }

  send(obj) {
    this.writeFrame(0x1, Buffer.from(JSON.stringify(obj)));
  }

  ping() {
    this.writeFrame(0x9, Buffer.alloc(0));
  }

  close(code = 1000, reason = '') {
    if (this.closed) return;
    const r = Buffer.from(String(reason).slice(0, 100));
    const payload = Buffer.alloc(2 + r.length);
    payload.writeUInt16BE(code, 0);
    r.copy(payload, 2);
    this.writeFrame(0x8, payload);
    this.closed = true;
    this.socket.end();
    setTimeout(() => this.socket.destroy(), 1000).unref();
    this.finish();
  }

  fail(code) {
    this.close(code);
    return false;
  }

  finish() {
    if (this.finished) return;
    this.finished = true;
    this.closed = true;
    this.onclose?.();
  }
}

function handleUpgrade(req, socket, config, onConnection) {
  const key = req.headers['sec-websocket-key'];
  const origin = req.headers.origin ?? '';
  const reject = (status, text) => {
    socket.end(`HTTP/1.1 ${status} ${text}\r\nConnection: close\r\n\r\n`);
  };
  if ((req.headers.upgrade ?? '').toLowerCase() !== 'websocket' || !key || req.headers['sec-websocket-version'] !== '13') {
    return reject(400, 'Bad Request');
  }
  if (config.allowedOrigins.length && !config.allowedOrigins.includes(origin)) return reject(403, 'Forbidden');
  const accept = crypto.createHash('sha1').update(key + WS_GUID).digest('base64');
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${accept}\r\n\r\n`,
  );
  onConnection(new WsConnection(socket), req);
}

// ---------------------------------------------------------------------------
// Game server
// ---------------------------------------------------------------------------

const NAME_RE = /^[A-Za-z0-9_]{3,16}$/;
const MIN_PASSWORD = 6;

class GameServer {
  constructor(config, store) {
    this.config = config;
    this.store = store;
    this.clients = new Map(); // id -> client
    this.nextId = 1;
    this.authAttempts = new Map(); // ip -> { count, reset }
  }

  get players() {
    return [...this.clients.values()].filter((c) => c.user);
  }

  info() {
    const c = this.config;
    return {
      type: 'info',
      name: c.name,
      motd: c.motd,
      public: !!c.public,
      players: this.players.length,
      maxPlayers: c.maxPlayers,
      allowRegistration: !!c.allowRegistration,
      version: VERSION,
      protocol: PROTOCOL,
    };
  }

  connect(ws, req) {
    const id = `p${this.nextId++}`;
    const ip = (req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? '').split(',')[0].trim();
    const client = { id, ws, ip, user: null, name: null, zone: null, state: null, admin: false, chat: [] };
    this.clients.set(id, client);
    ws.onmessage = (text) => {
      let msg;
      try {
        msg = JSON.parse(text);
      } catch {
        return;
      }
      if (msg && typeof msg.type === 'string') this.handle(client, msg);
    };
    ws.onclose = () => this.disconnect(client);
    // Unauthenticated connections get a short window to log in.
    client.authTimer = setTimeout(() => !client.user && ws.close(4000, 'Login timed out'), 30000);
  }

  handle(client, msg) {
    if (msg.type === 'info') return client.ws.send(this.info());
    if (msg.type === 'auth') return this.auth(client, msg);
    if (!client.user) return; // everything else needs a login
    switch (msg.type) {
      case 'state':
        return this.onState(client, msg);
      case 'save':
        return this.onSave(client, msg);
      case 'chat':
        return this.onChat(client, msg);
      case 'catch':
        return this.broadcast(
          {
            type: 'catch',
            from: client.id,
            name: client.name,
            fish: clip(msg.fish, 40),
            rarity: clip(msg.rarity, 20),
            size: num(msg.size, 0, 10000),
          },
          client,
        );
    }
  }

  // ---- auth ----

  rateLimited(ip) {
    const now = Date.now();
    const entry = this.authAttempts.get(ip);
    if (!entry || entry.reset < now) {
      this.authAttempts.set(ip, { count: 1, reset: now + 60000 });
      return false;
    }
    entry.count++;
    return entry.count > 10;
  }

  auth(client, msg) {
    const fail = (code, message) => client.ws.send({ type: 'error', code, message });
    if (client.user) return;
    if (msg.protocol !== PROTOCOL) {
      return fail('protocol', `This server speaks protocol ${PROTOCOL}; your game uses ${msg.protocol}. Update the game or server.`);
    }
    if (this.rateLimited(client.ip)) return fail('rate_limited', 'Too many login attempts. Wait a minute and try again.');
    if (!this.config.public && !safeEqual(msg.passcode ?? '', this.config.passcode)) {
      return fail('bad_passcode', 'That passcode is not right.');
    }
    if (this.players.length >= this.config.maxPlayers) return fail('full', 'The server is full. Try again later.');

    let user = null;
    if (msg.mode === 'token') {
      user = this.store.userForToken(msg.token);
      if (!user) return fail('bad_token', 'Your saved login expired. Please log in again.');
    } else {
      const name = String(msg.username ?? '').trim();
      const password = String(msg.password ?? '');
      if (msg.mode === 'register') {
        if (!this.config.allowRegistration) return fail('registration_closed', 'This server is not accepting new accounts.');
        if (!NAME_RE.test(name)) return fail('bad_name', 'Usernames are 3-16 letters, numbers or underscores.');
        if (password.length < MIN_PASSWORD) return fail('bad_password', `Passwords need at least ${MIN_PASSWORD} characters.`);
        if (this.store.user(name)) return fail('name_taken', 'That username is taken.');
        user = this.store.createUser(name, password);
        log(`New account: ${name}`);
      } else {
        user = this.store.user(name);
        if (!user || !safeEqual(hashPassword(password, user.salt), user.hash)) {
          return fail('bad_login', 'Wrong username or password.');
        }
      }
    }
    if (user.banned) return fail('banned', 'This account is banned from the server.');

    // One session per account: a new login replaces the old one.
    for (const other of this.players) {
      if (other.user === user) other.ws.close(4001, 'You logged in from somewhere else.');
    }

    clearTimeout(client.authTimer);
    client.user = user;
    client.name = user.name;
    client.admin = this.config.admins.includes(user.name.toLowerCase());
    user.lastLogin = Date.now();
    this.store.markDirty();

    client.ws.send({
      type: 'welcome',
      id: client.id,
      name: user.name,
      token: msg.remember ? this.store.issueToken(user) : null,
      save: user.save,
      serverTime: Date.now(),
      server: { name: this.config.name, motd: this.config.motd },
      admin: client.admin,
      players: this.players.filter((c) => c !== client).map((c) => ({ id: c.id, name: c.name, zone: c.zone })),
    });
    // Let the newcomer see everyone in the world straight away.
    for (const other of this.players) {
      if (other !== client && other.state) client.ws.send(other.state);
    }
    this.broadcast({ type: 'join', from: client.id, name: client.name }, client);
    this.system(`${client.name} joined the server`, client);
    log(`${client.name} joined (${this.players.length}/${this.config.maxPlayers})`);
  }

  disconnect(client) {
    clearTimeout(client.authTimer);
    this.clients.delete(client.id);
    if (!client.user) return;
    this.broadcast({ type: 'leave', from: client.id, name: client.name });
    this.system(`${client.name} left the server`);
    log(`${client.name} left (${this.players.length}/${this.config.maxPlayers})`);
    this.store.markDirty();
  }

  // ---- gameplay relays ----

  onState(client, msg) {
    const zone = clip(msg.zone, 20) || 'sunny';
    const state = {
      type: 'state',
      from: client.id,
      name: client.name,
      zone,
      x: num(msg.x, -500, 500),
      y: num(msg.y, -50, 50),
      z: num(msg.z, -500, 500),
      facing: num(msg.facing, -100, 100),
      speed: num(msg.speed, 0, 50),
      pose: clip(msg.pose, 12),
      rod: clip(msg.rod, 20),
      hat: clip(msg.hat, 20),
      bobber: Array.isArray(msg.bobber) ? msg.bobber.slice(0, 3).map((v) => num(v, -500, 500)) : null,
      holding: msg.holding && typeof msg.holding === 'object' ? { fish: clip(msg.holding.fish, 20), size: num(msg.holding.size, 0, 10000) } : null,
    };
    if (zone !== client.zone) {
      client.zone = zone;
      this.broadcast({ type: 'zone', from: client.id, name: client.name, zone }, client);
      // Arriving somewhere: show everyone already there right away, even if they're standing still.
      for (const other of this.players) {
        if (other !== client && other.zone === zone && other.state) client.ws.send(other.state);
      }
    }
    client.state = state;
    // Positions only matter to people in the same zone.
    for (const other of this.players) {
      if (other !== client && other.zone === zone) other.ws.send(state);
    }
  }

  onSave(client, msg) {
    const data = msg.data;
    if (!data || typeof data !== 'object' || Array.isArray(data)) return;
    if (Buffer.byteLength(JSON.stringify(data)) > MAX_SAVE_BYTES) return;
    client.user.save = data;
    this.store.markDirty();
  }

  onChat(client, msg) {
    const chat = this.config.chat;
    if (!chat.enabled) return this.whisper(client, 'Chat is turned off on this server.');
    let text = String(msg.text ?? '').replace(/\s+/g, ' ').trim().slice(0, chat.maxLength);
    if (!text) return;
    if (text.startsWith('/')) return this.command(client, text);

    const now = Date.now();
    client.chat = client.chat.filter((t) => now - t < chat.windowSeconds * 1000);
    if (client.chat.length >= chat.messagesPerWindow) return this.whisper(client, 'Slow down a little!');
    client.chat.push(now);

    for (const word of chat.blockedWords) {
      if (!word) continue;
      text = text.replace(new RegExp(escapeRegex(word), 'gi'), (m) => '*'.repeat(m.length));
    }
    this.broadcast({ type: 'chat', from: client.id, name: client.name, text });
    log(`<${client.name}> ${text}`);
  }

  // ---- chat commands ----

  command(client, text) {
    const [cmd, ...rest] = text.slice(1).split(' ');
    const arg = rest.join(' ').trim();
    const admin = client.admin;
    switch (cmd.toLowerCase()) {
      case 'help':
        return this.whisper(client, `Commands: /players${admin ? ', /kick <name>, /ban <name>, /unban <name>, /announce <text>' : ''}`);
      case 'players':
        return this.whisper(client, `Online (${this.players.length}): ${this.players.map((c) => c.name).join(', ')}`);
      case 'kick':
      case 'ban':
      case 'unban':
      case 'announce':
        if (!admin) return this.whisper(client, 'Only admins can do that.');
        return this.whisper(client, this.adminAction(cmd.toLowerCase(), arg, client.name));
      default:
        return this.whisper(client, `Unknown command. Try /help`);
    }
  }

  // Shared by chat commands and the server console. Returns a message for whoever asked.
  adminAction(action, arg, by = 'console') {
    if (action === 'announce' || action === 'say') {
      if (!arg) return 'Say what?';
      this.system(`📢 ${arg}`);
      return 'Announced.';
    }
    const target = this.store.user(arg);
    if (!target) return `No account named "${arg}".`;
    const online = this.players.find((c) => c.user === target);
    if (action === 'kick') {
      if (!online) return `${target.name} is not online.`;
      online.ws.close(4002, `Kicked by ${by}`);
      return `Kicked ${target.name}.`;
    }
    if (action === 'ban') {
      target.banned = true;
      this.store.revokeTokens(target);
      online?.ws.close(4003, 'You are banned from this server.');
      log(`${target.name} banned by ${by}`);
      return `Banned ${target.name}.`;
    }
    if (action === 'unban') {
      target.banned = false;
      this.store.markDirty();
      return `Unbanned ${target.name}.`;
    }
    return 'Unknown action.';
  }

  // ---- messaging helpers ----

  broadcast(msg, except = null) {
    for (const c of this.players) if (c !== except) c.ws.send(msg);
  }

  system(text, except = null) {
    this.broadcast({ type: 'chat', system: true, text }, except);
  }

  whisper(client, text) {
    client.ws.send({ type: 'chat', system: true, text });
  }

  heartbeat() {
    for (const c of this.clients.values()) {
      if (!c.ws.alive) {
        c.ws.socket.destroy();
        continue;
      }
      c.ws.alive = false;
      c.ws.ping();
    }
  }
}

function clip(v, max) {
  return typeof v === 'string' ? v.slice(0, max) : '';
}

function num(v, min, max) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : 0;
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---------------------------------------------------------------------------
// Cloudflare Tunnel (optional): runs `cloudflared`, downloading it on first use
// ---------------------------------------------------------------------------

const CLOUDFLARED_ASSETS = {
  'linux-x64': 'cloudflared-linux-amd64',
  'linux-arm64': 'cloudflared-linux-arm64',
  'linux-arm': 'cloudflared-linux-arm',
  'win32-x64': 'cloudflared-windows-amd64.exe',
};

function download(url, dest, redirects = 5) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'webfishing-server' } }, (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirects > 0) {
          res.resume();
          return resolve(download(new URL(res.headers.location, url).toString(), dest, redirects - 1));
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        const tmp = `${dest}.part`;
        const file = fs.createWriteStream(tmp);
        res.pipe(file);
        file.on('finish', () => file.close(() => {
          fs.renameSync(tmp, dest);
          resolve();
        }));
        file.on('error', reject);
      })
      .on('error', reject);
  });
}

// Find cloudflared: an explicit path, one on PATH, or download the official release.
async function findCloudflared(dataDir) {
  if (process.env.CLOUDFLARED_PATH) return process.env.CLOUDFLARED_PATH;
  const onPath = await new Promise((resolve) => {
    const p = spawn('cloudflared', ['--version'], { stdio: 'ignore' });
    p.on('error', () => resolve(false));
    p.on('exit', (code) => resolve(code === 0));
  });
  if (onPath) return 'cloudflared';

  const asset = CLOUDFLARED_ASSETS[`${process.platform}-${process.arch}`];
  if (!asset) throw new Error(`No automatic download for ${process.platform}/${process.arch}. Install cloudflared yourself (https://github.com/cloudflare/cloudflared).`);
  const binDir = path.join(path.resolve(__dirname, dataDir), 'bin');
  const bin = path.join(binDir, asset);
  if (!fs.existsSync(bin)) {
    fs.mkdirSync(binDir, { recursive: true });
    log('Downloading cloudflared (one time, ~40 MB)...');
    await download(`https://github.com/cloudflare/cloudflared/releases/latest/download/${asset}`, bin);
    fs.chmodSync(bin, 0o755);
  }
  return bin;
}

// Starts the tunnel and keeps it running. onAddress(host) fires once a quick tunnel is
// actually connected (not just when Cloudflare hands out the address).
async function startTunnel(config, onAddress) {
  let bin;
  try {
    bin = await findCloudflared(config.dataDir);
  } catch (e) {
    log(`✖ Tunnel: could not get cloudflared (${e.message}). Players can still join on this machine via localhost.`);
    return { stop() {} };
  }
  const local = `${config.tls.cert ? 'https' : 'http'}://localhost:${config.port}`;
  // HTTP/2 runs over plain TCP, which hosting containers allow far more often than QUIC (UDP).
  const protocol = ['http2', 'quic', 'auto'].includes(config.tunnel.protocol) ? config.tunnel.protocol : 'http2';
  const common = ['tunnel', '--no-autoupdate', '--protocol', protocol];
  const args = config.tunnel.token
    ? [...common, 'run', '--token', config.tunnel.token]
    : [...common, '--url', local, ...(config.tls.cert ? ['--no-tls-verify'] : [])];
  let child = null;
  let stopped = false;
  let delay = 2000;

  const run = () => {
    log(config.tunnel.token ? 'Starting your Cloudflare Tunnel...' : 'Starting a free Cloudflare quick tunnel...');
    child = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let host = null;
    let connected = false;
    let failures = 0;
    let explained = false;
    const onOutput = (chunk) => {
      const text = String(chunk);
      const quick = text.match(/https:\/\/([a-z0-9-]+\.trycloudflare\.com)/i);
      if (quick && !host) {
        host = quick[1];
        log(`Tunnel address reserved: ${host}. Connecting to Cloudflare (${protocol})...`);
      }
      if (!connected && /Registered tunnel connection/i.test(text)) {
        connected = true;
        delay = 2000;
        if (config.tunnel.token) log('✔ Tunnel connected. Players join with the hostname you set in the Cloudflare dashboard.');
        else if (host) onAddress(host);
      }
      for (const line of text.split('\n')) {
        if (!/\bERR\b/.test(line)) continue;
        failures++;
        if (failures <= 3) log(`tunnel: ${line.replace(/^\S+\s+/, '').trim().slice(0, 160)}`);
      }
      if (!connected && failures >= 4 && !explained) {
        explained = true;
        log(
          protocol === 'quic' || protocol === 'auto'
            ? '✖ The tunnel cannot reach Cloudflare over QUIC (UDP). Set "protocol": "http2" in the tunnel settings and restart.'
            : '✖ The tunnel cannot reach Cloudflare: this host seems to block outgoing connections to port 7844. ' +
                'Ask your host to allow outbound TCP 7844, or see README "If the tunnel can\'t connect".',
        );
      }
    };
    child.stdout.on('data', onOutput);
    child.stderr.on('data', onOutput);
    child.on('error', (e) => log(`✖ Tunnel failed to start: ${e.message}`));
    child.on('exit', (code) => {
      if (stopped) return;
      log(`Tunnel stopped (code ${code}). Restarting in ${Math.round(delay / 1000)}s...`);
      setTimeout(run, delay);
      delay = Math.min(delay * 2, 60000);
    });
  };
  run();

  return {
    stop() {
      stopped = true;
      child?.kill();
    },
  };
}

// ---------------------------------------------------------------------------
// Console commands for the server owner
// ---------------------------------------------------------------------------

function startConsole(game, store, shutdown) {
  const rl = readline.createInterface({ input: process.stdin });
  const help = 'Commands: list, address, say <text>, kick <name>, ban <name>, unban <name>, op <name>, deop <name>, save, stop';
  rl.on('line', (line) => {
    const [cmd, ...rest] = line.trim().split(' ');
    const arg = rest.join(' ').trim();
    switch ((cmd ?? '').toLowerCase()) {
      case '':
        return;
      case 'help':
        return log(help);
      case 'list':
        return log(`Online (${game.players.length}/${game.config.maxPlayers}): ${game.players.map((c) => `${c.name}${c.admin ? ' (admin)' : ''} [${c.zone ?? '-'}]`).join(', ') || 'nobody'}`);
      case 'address':
        return log(game.publicAddress ? `Players connect with: ${game.publicAddress}` : 'No tunnel address (tunnel off, still starting, or using your own domain).');
      case 'say':
        return log(game.adminAction('say', arg));
      case 'kick':
      case 'ban':
      case 'unban':
        return log(game.adminAction(cmd.toLowerCase(), arg));
      case 'op':
      case 'deop': {
        const name = arg.toLowerCase();
        if (!name) return log('Whose admin rights?');
        const admins = new Set(game.config.admins);
        cmd === 'op' ? admins.add(name) : admins.delete(name);
        game.config.admins = [...admins];
        for (const c of game.players) c.admin = admins.has(c.name.toLowerCase());
        // Persist to config.json so it survives a restart.
        const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
        raw.admins = game.config.admins;
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(raw, null, 2) + '\n');
        return log(`${arg} is ${cmd === 'op' ? 'now' : 'no longer'} an admin.`);
      }
      case 'save':
        store.flush();
        return log('Saved.');
      case 'stop':
        return shutdown();
      default:
        return log(`Unknown command. ${help}`);
    }
  });
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

function main() {
  const config = loadConfig();
  const store = new Store(config.dataDir);
  const game = new GameServer(config, store);

  // A plain web page at the server address, handy for checking it's up.
  const onRequest = (req, res) => {
    const info = game.info();
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ ...info, hint: 'This is a WebFishing server. Add its address in the game under Multiplayer.' }, null, 2));
  };

  const useTls = config.tls.cert && config.tls.key;
  const server = useTls
    ? https.createServer(
        { cert: fs.readFileSync(path.resolve(__dirname, config.tls.cert)), key: fs.readFileSync(path.resolve(__dirname, config.tls.key)) },
        onRequest,
      )
    : http.createServer(onRequest);

  server.on('upgrade', (req, socket) => handleUpgrade(req, socket, config, (ws, r) => game.connect(ws, r)));
  const beat = setInterval(() => game.heartbeat(), 30000);

  let tunnel = null;
  const shutdown = () => {
    log('Shutting down...');
    tunnel?.stop();
    clearInterval(beat);
    for (const c of game.clients.values()) c.ws.close(1001, 'Server is shutting down');
    store.flush();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 2000).unref();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  server.on('error', (e) => fatal(e.code === 'EADDRINUSE' ? `Port ${config.port} is already in use. Change "port" in config.json.` : e.message));
  server.listen(config.port, config.host, () => {
    const scheme = useTls ? 'wss' : 'ws';
    console.log(`\n  🎣 WebFishing server v${VERSION}`);
    console.log(`  Name:     ${config.name}`);
    console.log(`  Access:   ${config.public ? 'public (anyone can join)' : 'private (passcode required)'}`);
    console.log(`  Address:  ${scheme}://localhost:${config.port}${useTls ? '' : '   (use wss:// via TLS or a tunnel for players online, see README)'}`);
    console.log(`  Players:  up to ${config.maxPlayers}\n`);
    log('Type "help" for console commands.');
    if (config.tunnel.enabled) {
      startTunnel(config, (host) => {
        game.publicAddress = host;
        console.log(`\n  ✔ Secure address ready. Players add this in Multiplayer:\n\n      ${host}\n`);
        console.log('  (Free quick tunnels get a new address each restart. See README for a permanent one.)\n');
      }).then((t) => (tunnel = t));
    }
  });

  // Works in a terminal and in hosting panel consoles (which pipe stdin rather than use a TTY).
  startConsole(game, store, shutdown);
  return { server, game, store, shutdown };
}

if (require.main === module) main();
module.exports = { main, PROTOCOL, VERSION, findCloudflared };
