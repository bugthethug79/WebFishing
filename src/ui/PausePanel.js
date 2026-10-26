// Pause menu: volume sliders, graphics toggles and a controls reference.

import { el } from './format.js';

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
];

export class PausePanel {
  constructor(settings, onResume, onPreview) {
    this.settings = settings;
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
    this.el.addEventListener('input', (e) => {
      const key = e.target.dataset.key;
      if (!key) return;
      const value = e.target.type === 'checkbox' ? e.target.checked : Number(e.target.value);
      settings.set(key, value);
      this.render();
      if (key === 'sfxVolume' || key === 'masterVolume') onPreview?.();
    });
  }

  render() {
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
