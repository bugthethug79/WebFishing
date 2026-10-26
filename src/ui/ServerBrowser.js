// Multiplayer menu: saved servers with live status, add/remove, then log in or register.

import { el } from './format.js';
import { normalizeAddress } from '../net/protocol.js';
import { getServers, addServer, removeServer, getLogin, forgetLogin } from '../net/serverList.js';
import { OnlineSession, probeServer } from '../net/OnlineSession.js';

export class ServerBrowser {
  constructor({ onBack, onJoined }) {
    this.onBack = onBack;
    this.onJoined = onJoined;
    this.el = el('<div class="server-browser"></div>');
    this.showList();
  }

  // ---------- server list ----------

  showList() {
    this.el.replaceChildren(
      el(`
        <div class="sb-card">
          <div class="sb-header">
            <button class="sb-icon back" title="Back">←</button>
            <h2>Multiplayer</h2>
            <button class="sb-icon refresh" title="Refresh">⟳</button>
          </div>
          <div class="sb-list"></div>
          <form class="sb-add">
            <input class="sb-address" placeholder="Server address, e.g. fish.example.com" autocomplete="off" />
            <button class="btn" type="submit">Add</button>
          </form>
          <p class="sb-hint">Anyone can host a server. Ask the owner for its address. <a href="https://github.com/bugthethug79/WebFishing/tree/HEAD/server" target="_blank" rel="noopener">Host your own</a></p>
        </div>
      `),
    );
    this.el.querySelector('.back').addEventListener('click', () => this.onBack());
    this.el.querySelector('.refresh').addEventListener('click', () => this.renderList());
    this.el.querySelector('.sb-add').addEventListener('submit', (e) => {
      e.preventDefault();
      const input = this.el.querySelector('.sb-address');
      const value = input.value.trim();
      if (!normalizeAddress(value)) {
        input.classList.add('invalid');
        return;
      }
      input.classList.remove('invalid');
      addServer(value);
      input.value = '';
      this.renderList();
    });
    this.renderList();
  }

  renderList() {
    const list = this.el.querySelector('.sb-list');
    const servers = getServers();
    if (!servers.length) {
      list.replaceChildren(
        el('<div class="sb-empty">No servers yet.<br/>Ask a friend for their server address and add it below.<br/><small>Hosting one on this computer? Add <b>localhost:8787</b>.</small></div>'),
      );
      return;
    }
    list.replaceChildren(
      ...servers.map((s) => {
        const row = el(`
          <div class="sb-row">
            <div class="sb-main">
              <div class="sb-name"></div>
              <div class="sb-motd">Checking…</div>
              <div class="sb-address-label"></div>
            </div>
            <div class="sb-status"><span class="sb-players"></span><span class="sb-ping"></span></div>
            <button class="btn join" disabled>Join</button>
            <button class="sb-icon remove" title="Remove">✕</button>
          </div>
        `);
        row.querySelector('.sb-name').textContent = s.label || s.address;
        row.querySelector('.sb-address-label').textContent = s.address;
        row.querySelector('.remove').addEventListener('click', () => {
          removeServer(s.address);
          this.renderList();
        });
        probeServer(s.address).then((res) => {
          if (!row.isConnected) return;
          const motd = row.querySelector('.sb-motd');
          if (!res.ok) {
            row.classList.add('offline');
            motd.textContent = 'Offline or unreachable';
            return;
          }
          const { info } = res;
          row.querySelector('.sb-name').textContent = `${info.public ? '' : '🔒 '}${info.name}`;
          motd.textContent = info.motd;
          row.querySelector('.sb-players').textContent = `👥 ${info.players}/${info.maxPlayers}`;
          row.querySelector('.sb-ping').textContent = `${res.ping} ms`;
          const join = row.querySelector('.join');
          join.disabled = false;
          join.addEventListener('click', () => this.showLogin(s.address, info));
        });
        return row;
      }),
    );
  }

  // ---------- login / register ----------

  showLogin(address, info) {
    const saved = getLogin(address);
    this.mode = saved ? 'saved' : 'login';
    const card = el(`
      <form class="sb-card sb-login">
        <div class="sb-header">
          <button class="sb-icon back" type="button" title="Back">←</button>
          <h2 class="sb-server-name"></h2>
          <span></span>
        </div>
        <p class="sb-motd-full"></p>
        <div class="sb-saved" hidden>
          <button class="btn big continue" type="button"></button>
          <button class="link other" type="button">Use a different account</button>
        </div>
        <div class="sb-fields">
          <div class="tabs sb-tabs">
            <button class="tab" type="button" data-mode="login">Log in</button>
            <button class="tab" type="button" data-mode="register">Create account</button>
          </div>
          <input class="sb-user" placeholder="Username" maxlength="16" autocomplete="username" />
          <input class="sb-pass" type="password" placeholder="Password" autocomplete="current-password" />
          <label class="sb-remember"><input type="checkbox" checked /> Remember me on this device</label>
        </div>
        <input class="sb-passcode" type="password" placeholder="Server passcode" hidden />
        <div class="sb-error"></div>
        <button class="btn big submit" type="submit">Log in</button>
      </form>
    `);
    this.el.replaceChildren(card);
    const q = (s) => card.querySelector(s);
    q('.sb-server-name').textContent = `${info.public ? '' : '🔒 '}${info.name}`;
    q('.sb-motd-full').textContent = info.motd;
    q('.back').addEventListener('click', () => this.showList());
    if (!info.public) q('.sb-passcode').hidden = false;
    if (!info.allowRegistration) q('[data-mode="register"]').hidden = true;

    const setMode = (mode) => {
      this.mode = mode;
      const savedView = mode === 'saved';
      q('.sb-saved').hidden = !savedView;
      q('.sb-fields').hidden = savedView;
      q('.submit').hidden = savedView;
      for (const t of card.querySelectorAll('.sb-tabs .tab')) t.classList.toggle('active', t.dataset.mode === mode);
      q('.submit').textContent = mode === 'register' ? 'Create account' : 'Log in';
      q('.sb-pass').autocomplete = mode === 'register' ? 'new-password' : 'current-password';
      q('.sb-error').textContent = '';
    };
    card.querySelectorAll('.sb-tabs .tab').forEach((t) => t.addEventListener('click', () => setMode(t.dataset.mode)));
    if (saved) {
      q('.continue').textContent = `Continue as ${saved.username}`;
      q('.continue').addEventListener('click', () => this.join(address, card, info, { mode: 'token', token: saved.token, remember: true }));
      q('.other').addEventListener('click', () => {
        forgetLogin(address);
        setMode('login');
      });
    }
    setMode(this.mode);

    card.addEventListener('submit', (e) => {
      e.preventDefault();
      this.join(address, card, info, {
        mode: this.mode,
        username: q('.sb-user').value,
        password: q('.sb-pass').value,
        remember: q('.sb-remember input').checked,
      });
    });
  }

  async join(address, card, info, fields) {
    const q = (s) => card.querySelector(s);
    const error = q('.sb-error');
    const buttons = card.querySelectorAll('button');
    buttons.forEach((b) => (b.disabled = true));
    error.textContent = 'Connecting…';
    error.classList.remove('bad');
    const session = new OnlineSession(address);
    try {
      const welcome = await session.login({ ...fields, passcode: q('.sb-passcode').value });
      this.onJoined(session, welcome);
    } catch (err) {
      error.textContent = err.message ?? 'Something went wrong.';
      error.classList.add('bad');
      buttons.forEach((b) => (b.disabled = false));
      if (err.code === 'bad_token') {
        forgetLogin(address);
        this.showLogin(address, info);
        this.el.querySelector('.sb-error').textContent = err.message;
      }
    }
  }
}
