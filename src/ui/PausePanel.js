// Pause menu: volume sliders, graphics toggles and a controls reference.

import { el } from './format.js';
import { NAME_MAX } from '../save/Profile.js';

const SLIDERS = [
  ['masterVolume', 'Master volume'],
  ['musicVolume', 'Music'],
  ['sfxVolume', 'Sound effects'],
  ['ambientVolume', 'Ambience'],
];

const TOGGLES = [
  ['shadows', 'Shadows'],
  ['highResolution', 'High resolution'],
  ['showControls', 'Show controls hint'],
];

const CONTROLS = [
  ['WASD', 'Move'],
  ['Shift', 'Run'],
  ['Space / Click', 'Cast, hook, reel'],
  ['F', 'Interact'],
  ['B', 'Bucket'],
  ['J', 'Journal'],
  ['Q / E', 'Rotate camera'],
  ['Scroll', 'Zoom'],
  ['Esc', 'Pause / close'],
  ['T', 'Chat (online)'],
  ['Tab', 'Player list (online)'],
];

export class PausePanel {
  // save: { getName(), onRename(name), onExport() -> code, onImport(code) -> bool, onReset() }
  constructor(settings, onResume, onPreview, save) {
    this.settings = settings;
    this.save = save;
    this.el = el(`
      <div class="pause-panel">
        <div class="panel-header">
          <div class="panel-title">⏸️ Paused</div>
          <button class="panel-close" aria-label="Close">✕</button>
        </div>
        <div class="panel-body pause-body">
          <section class="pause-section">
            <h3>Sound</h3>
            ${SLIDERS.map(([key, label]) => `
              <label class="setting">
                <span>${label}</span>
                <input type="range" min="0" max="1" step="0.05" data-key="${key}" />
                <span class="setting-value" data-value="${key}"></span>
              </label>`).join('')}
            <h3>Graphics</h3>
            ${TOGGLES.map(([key, label]) => `
              <label class="setting toggle">
                <span>${label}</span>
                <input type="checkbox" data-key="${key}" />
                <span class="switch"></span>
              </label>`).join('')}
          </section>
          <section class="pause-section">
            <div class="online-box" hidden>
              <h3>Online</h3>
              <p class="online-info"></p>
              <button class="btn secondary danger leave">Leave server</button>
            </div>
            <div class="solo-box">
            <h3>Profile</h3>
            <form class="name-form">
              <input class="name-input" maxlength="${NAME_MAX}" autocomplete="off" />
              <button class="btn secondary" type="submit">Rename</button>
            </form>
            <h3>Save data</h3>
            <p class="save-note">Your progress saves automatically in this browser.</p>
            <div class="save-actions">
              <button class="btn secondary export">Copy save code</button>
              <button class="btn secondary import-toggle">Load save code</button>
              <button class="btn secondary danger reset">Start over</button>
            </div>
            <div class="import-box" hidden>
              <textarea class="import-code" rows="3" placeholder="Paste a save code here"></textarea>
              <button class="btn import">Load</button>
            </div>
            </div>
            <h3>Controls</h3>
            <dl class="controls-list">
              ${CONTROLS.map(([k, v]) => `<dt><kbd>${k}</kbd></dt><dd>${v}</dd>`).join('')}
            </dl>
          </section>
        </div>
        <div class="pause-actions"><button class="btn resume">Resume</button></div>
      </div>
    `);

    this.el.querySelector('.resume').addEventListener('click', onResume);
    this.wireSave();
    this.el.addEventListener('input', (e) => {
      const key = e.target.dataset.key;
      if (!key) return;
      const value = e.target.type === 'checkbox' ? e.target.checked : Number(e.target.value);
      settings.set(key, value);
      this.render();
      if (key === 'sfxVolume' || key === 'masterVolume') onPreview?.();
    });
  }

  // Online play: show the server and a Leave button instead of local save tools.
  setOnline({ server, name, onLeave }) {
    this.el.querySelector('.online-box').hidden = false;
    this.el.querySelector('.solo-box').hidden = true;
    this.el.querySelector('.online-info').textContent = `Playing on ${server} as ${name}. Your progress is saved on the server.`;
    this.el.querySelector('.leave').addEventListener('click', onLeave);
  }

  wireSave() {
    const q = (s) => this.el.querySelector(s);
    const note = q('.save-note');
    const say = (text) => (note.textContent = text);

    q('.name-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.save.onRename(q('.name-input').value);
      q('.name-input').value = this.save.getName();
      say(`Nice to meet you, ${this.save.getName()}!`);
    });

    q('.export').addEventListener('click', async () => {
      const code = this.save.onExport();
      try {
        await navigator.clipboard.writeText(code);
        say('Save code copied! Paste it into "Load save code" on another device.');
      } catch {
        // Clipboard can be blocked; show the code so it can be copied by hand.
        q('.import-box').hidden = false;
        q('.import-code').value = code;
        say('Copy the code below to keep your save.');
      }
    });

    q('.import-toggle').addEventListener('click', () => {
      q('.import-box').hidden = !q('.import-box').hidden;
    });
    q('.import').addEventListener('click', () => {
      const ok = this.save.onImport(q('.import-code').value);
      say(ok ? 'Save loaded!' : 'That code didn\'t work. Check you copied all of it.');
    });

    const reset = q('.reset');
    reset.addEventListener('click', () => {
      // Two clicks, so nobody loses their journal by accident.
      if (!reset.classList.contains('confirm')) {
        reset.classList.add('confirm');
        reset.textContent = 'Really? Click again';
        setTimeout(() => {
          reset.classList.remove('confirm');
          reset.textContent = 'Start over';
        }, 3000);
        return;
      }
      this.save.onReset();
    });
  }

  render() {
    this.el.querySelector('.name-input').value = this.save.getName();
    this.el.querySelector('.save-note').textContent = 'Your progress saves automatically in this browser.';
    for (const input of this.el.querySelectorAll('input[data-key]')) {
      const v = this.settings.get(input.dataset.key);
      if (input.type === 'checkbox') input.checked = v;
      else input.value = v;
    }
    for (const span of this.el.querySelectorAll('[data-value]')) {
      span.textContent = `${Math.round(this.settings.get(span.dataset.value) * 100)}%`;
    }
  }
}
