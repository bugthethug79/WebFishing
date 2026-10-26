// Title screen: Play Solo (local save) or Multiplayer (server browser -> login).
// Starting is also the user gesture that unlocks audio.

import { el } from './format.js';
import { NAME_MAX } from '../save/Profile.js';
import { ServerBrowser } from './ServerBrowser.js';

export class TitleScreen {
  // profile: { name, isNew }. onSolo(name), onOnline(session, welcome).
  constructor(root, profile, { onSolo, onOnline }) {
    this.profile = profile;
    this.onSolo = onSolo;
    this.onOnline = onOnline;
    this.el = el(`
      <div class="title-screen">
        <div class="title-logo">
          <span class="title-fish">🎣</span>
          <h1>WebFishing</h1>
          <p>A cozy little fishing game</p>
        </div>
        <div class="title-view"></div>
      </div>
    `);
    this.view = this.el.querySelector('.title-view');
    root.appendChild(this.el);
    this.active = true;
    this.showMain();

    // Returning solo players can just press Enter.
    this.onKey = (e) => {
      if (this.mode === 'main' && e.code === 'Enter' && !this.profile.isNew) this.startSolo(this.profile.name);
    };
    window.addEventListener('keydown', this.onKey);
  }

  showMain() {
    this.mode = 'main';
    const p = this.profile;
    this.view.replaceChildren(
      el(`
        <div class="title-menu">
          ${p.isNew ? '' : '<div class="title-welcome">Welcome back, <b></b>!</div>'}
          <button class="btn big solo">🏝️ Play Solo</button>
          <button class="btn big secondary multi">🌐 Multiplayer</button>
        </div>
      `),
    );
    if (!p.isNew) this.view.querySelector('.title-welcome b').textContent = p.name;
    this.view.querySelector('.solo').addEventListener('click', () => (p.isNew ? this.showName() : this.startSolo(p.name)));
    this.view.querySelector('.multi').addEventListener('click', () => this.showServers());
  }

  showName() {
    this.mode = 'name';
    this.view.replaceChildren(
      el(`
        <form class="title-new">
          <label for="title-name">What should we call you?</label>
          <input id="title-name" maxlength="${NAME_MAX}" placeholder="Your name" autocomplete="off" />
          <div class="title-row">
            <button class="btn secondary back" type="button">Back</button>
            <button class="btn" type="submit">Start fishing</button>
          </div>
        </form>
      `),
    );
    const form = this.view.querySelector('form');
    const input = form.querySelector('input');
    setTimeout(() => input.focus(), 50);
    form.querySelector('.back').addEventListener('click', () => this.showMain());
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      input.blur();
      this.startSolo(input.value);
    });
  }

  showServers() {
    this.mode = 'servers';
    const browser = new ServerBrowser({
      onBack: () => this.showMain(),
      onJoined: (session, welcome) => this.finish(() => this.onOnline(session, welcome)),
    });
    this.view.replaceChildren(browser.el);
  }

  startSolo(name) {
    this.finish(() => this.onSolo(name));
  }

  finish(then) {
    if (!this.active) return;
    this.active = false;
    window.removeEventListener('keydown', this.onKey);
    this.el.classList.add('hidden');
    setTimeout(() => this.el.remove(), 800);
    then();
  }
}
