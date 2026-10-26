// End-to-end tests for server.js using Node's built-in WebSocket client (Node 22+).
// Run with: npm test   (starts throwaway servers on port 18787 with temporary data)
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'webfishing-test-'));
const SERVER = path.join(path.dirname(fileURLToPath(import.meta.url)), 'server.js');
let passed = 0, failed = 0;
const ok = (cond, label) => { cond ? passed++ : failed++; console.log(`${cond ? '  ✓' : '  ✗'} ${label}`); };

function writeConfig(name, overrides) {
  const file = path.join(DIR, `${name}.json`);
  fs.writeFileSync(file, JSON.stringify({ name: 'Test Server', port: 18787, dataDir: path.join(DIR, `data-${name}`), admins: ['boss'], chat: { messagesPerWindow: 3, windowSeconds: 5, blockedWords: ['badword'] }, ...overrides }));
  return file;
}

function startServer(configFile) {
  return new Promise((resolve) => {
    const p = spawn('node', [SERVER], { env: { ...process.env, WEBFISHING_CONFIG: configFile, WEBFISHING_CONSOLE: '1' } });
    p.stdout.on('data', (d) => { if (String(d).includes('WebFishing server')) setTimeout(() => resolve(p), 100); });
    p.stderr.on('data', (d) => process.stderr.write('SERVER ERR: ' + d));
  });
}
const stop = (p) => new Promise((r) => { p.on('exit', r); p.kill('SIGINT'); });

class Client {
  constructor() { this.msgs = []; this.waiters = []; }
  open() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket('ws://localhost:18787');
      this.ws.onopen = resolve; this.ws.onerror = reject;
      this.ws.onmessage = (e) => { const m = JSON.parse(e.data); this.msgs.push(m); this.waiters = this.waiters.filter((w) => !w(m)); };
      this.ws.onclose = (e) => { this.closed = e; };
    });
  }
  send(m) { this.ws.send(JSON.stringify(m)); }
  next(pred, ms = 2000) {
    const found = this.msgs.find(pred);
    if (found) { this.msgs.splice(this.msgs.indexOf(found), 1); return Promise.resolve(found); }
    return new Promise((resolve) => {
      const t = setTimeout(() => resolve(null), ms);
      this.waiters.push((m) => { if (pred(m)) { clearTimeout(t); this.msgs.splice(this.msgs.indexOf(m), 1); resolve(m); return true; } return false; });
    });
  }
  async auth(fields) { this.send({ type: 'auth', protocol: 1, ...fields }); return this.next((m) => m.type === 'welcome' || m.type === 'error'); }
  close() { this.ws.close(); }
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- public server ----------
fs.rmSync(path.join(DIR, 'data-pub'), { recursive: true, force: true });
let srv = await startServer(writeConfig('pub', {}));
console.log('Public server');

const probe = new Client(); await probe.open(); probe.send({ type: 'info' });
const info = await probe.next((m) => m.type === 'info');
ok(info?.name === 'Test Server' && info.public === true && info.players === 0, 'info handshake (name, public, players)'); probe.close();

const a = new Client(); await a.open();
let r = await a.auth({ mode: 'register', username: 'x', password: 'secret1' });
ok(r.type === 'error' && r.code === 'bad_name', 'rejects too-short username');
r = await a.auth({ mode: 'register', username: 'alice', password: '123' });
ok(r.code === 'bad_password', 'rejects short password');
r = await a.auth({ mode: 'register', username: 'alice', password: 'secret1', remember: true });
ok(r.type === 'welcome' && r.name === 'alice' && r.token && r.save === null, 'registers alice, gets token + empty save');
const aliceToken = r.token;
ok(typeof r.serverTime === 'number' && Math.abs(r.serverTime - Date.now()) < 5000, 'welcome includes server time');

const b = new Client(); await b.open();
r = await b.auth({ mode: 'register', username: 'ALICE', password: 'secret1' });
ok(r.code === 'name_taken', 'usernames are case-insensitive unique');
r = await b.auth({ mode: 'login', username: 'alice', password: 'wrongpw' });
ok(r.code === 'bad_login', 'wrong password rejected');
r = await b.auth({ mode: 'register', username: 'bob', password: 'hunter22' });
ok(r.type === 'welcome' && r.players.some((p) => p.name === 'alice'), 'bob registers and sees alice in the player list');
ok(!!(await a.next((m) => m.type === 'join' && m.name === 'bob')), 'alice is told bob joined');
ok(!!(await a.next((m) => m.type === 'chat' && m.system && /bob joined/.test(m.text))), 'system chat announces the join');

// state relay, zone filtering
a.send({ type: 'state', zone: 'sunny', x: 1, y: 0.4, z: 2, facing: 0, speed: 0, pose: 'idle', rod: 'bamboo', hat: 'bucket', bobber: null });
b.send({ type: 'state', zone: 'sunny', x: 5, y: 0.4, z: 2, facing: 0, speed: 0, pose: 'idle', rod: 'bamboo', hat: 'bucket', bobber: null });
let st = await b.next((m) => m.type === 'state' && m.name === 'alice');
ok(st && st.x === 1 && st.from, 'state relayed to same-zone player (with sender id + name)');
b.send({ type: 'state', zone: 'pine', x: 0, y: 0, z: 0, facing: 0, speed: 0, pose: 'idle' });
ok(!!(await a.next((m) => m.type === 'zone' && m.name === 'bob' && m.zone === 'pine')), 'zone change is announced');
a.msgs = [];
b.send({ type: 'state', zone: 'pine', x: 9, y: 0, z: 0, facing: 0, speed: 0, pose: 'idle' });
ok(!(await a.next((m) => m.type === 'state' && m.name === 'bob', 500)), 'states are not relayed across zones');
b.send({ type: 'state', zone: 'sunny', x: 1e9, y: 0, z: 0, facing: 0, speed: 0, pose: 'idle' });
st = await a.next((m) => m.type === 'state' && m.name === 'bob');
ok(st && st.x === 500, 'out-of-range numbers are clamped');

// chat
a.send({ type: 'chat', text: 'hello   there  this has a badword in it' });
const c1 = await b.next((m) => m.type === 'chat' && m.name === 'alice');
ok(c1?.text === 'hello there this has a ******* in it', 'chat relayed, whitespace tidied, blocked word masked');
for (let i = 0; i < 4; i++) a.send({ type: 'chat', text: `spam ${i}` });
ok(!!(await a.next((m) => m.system && /Slow down/.test(m.text))), 'chat rate limit kicks in');
a.send({ type: 'chat', text: '/players' });
ok(!!(await a.next((m) => m.system && /Online \(2\)/.test(m.text))), '/players lists who is online');
a.send({ type: 'chat', text: '/kick bob' });
ok(!!(await a.next((m) => m.system && /Only admins/.test(m.text))), 'non-admins cannot /kick');

// saves persist
a.send({ type: 'save', data: { version: 1, state: { money: 4242 } } });
await wait(300);

// token login + single session
const a2 = new Client(); await a2.open();
r = await a2.auth({ mode: 'token', token: aliceToken });
ok(r.type === 'welcome' && r.name === 'alice' && r.save?.state?.money === 4242, 'token login restores the account and its save');
await wait(300);
ok(a.closed?.code === 4001, 'older session is kicked when the same account logs in again');

// admin
const boss = new Client(); await boss.open();
r = await boss.auth({ mode: 'register', username: 'boss', password: 'bosspass' });
ok(r.admin === true, 'admin from config gets admin flag');
boss.send({ type: 'chat', text: '/kick bob' });
await wait(300);
ok(b.closed?.code === 4002, 'admin /kick disconnects the player');
boss.send({ type: 'chat', text: '/ban bob' });
await wait(200);
const b2 = new Client(); await b2.open();
r = await b2.auth({ mode: 'login', username: 'bob', password: 'hunter22' });
ok(r.code === 'banned', 'banned player cannot log in');
boss.send({ type: 'chat', text: '/unban bob' }); await wait(200);
r = await b2.auth({ mode: 'login', username: 'bob', password: 'hunter22' });
ok(r.type === 'welcome', 'unban lets them back in');

a2.close(); boss.close(); b2.close();
await wait(300);
await stop(srv);

// restart: data persisted to disk
srv = await startServer(writeConfig('pub', {}));
const a3 = new Client(); await a3.open();
r = await a3.auth({ mode: 'login', username: 'alice', password: 'secret1' });
ok(r.type === 'welcome' && r.save?.state?.money === 4242, 'accounts + saves survive a server restart');
const stored = JSON.parse(fs.readFileSync(path.join(DIR, 'data-pub', 'accounts.json'), 'utf8'));
ok(!JSON.stringify(stored).includes('secret1') && !JSON.stringify(stored).includes(aliceToken), 'passwords and tokens are not stored in plain text');
a3.close(); await wait(200); await stop(srv);

// ---------- private server ----------
console.log('Private server');
fs.rmSync(path.join(DIR, 'data-priv'), { recursive: true, force: true });
srv = await startServer(writeConfig('priv', { public: false, passcode: 'trout', maxPlayers: 1 }));
const p0 = new Client(); await p0.open(); p0.send({ type: 'info' });
ok((await p0.next((m) => m.type === 'info'))?.public === false, 'info reports private');
const p1 = new Client(); await p1.open();
r = await p1.auth({ mode: 'register', username: 'carol', password: 'secret1', passcode: 'salmon' });
ok(r.code === 'bad_passcode', 'wrong passcode rejected');
r = await p1.auth({ mode: 'register', username: 'carol', password: 'secret1', passcode: 'trout' });
ok(r.type === 'welcome', 'right passcode lets you in');
const p2 = new Client(); await p2.open();
r = await p2.auth({ mode: 'register', username: 'dave', password: 'secret1', passcode: 'trout' });
ok(r.code === 'full', 'maxPlayers enforced');
r = await p2.auth({ mode: 'login', username: 'x', password: 'y', passcode: 'trout', protocol: 99 });
ok(r.code === 'protocol', 'protocol mismatch is explained');
p0.close(); p1.close(); p2.close(); await wait(200); await stop(srv);

fs.rmSync(DIR, { recursive: true, force: true });
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
