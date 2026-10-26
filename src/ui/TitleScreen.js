// "Click to start" screen. Also the user gesture that unlocks audio.

import { el } from './format.js';

export class TitleScreen {
  constructor(root, onStart) {
    this.el = el(`
      <div class="title-screen">
        <div class="title-logo">
          <span class="title-fish">🎣</span>
          <h1>WebFishing</h1>
          <p>A cozy little fishing game</p>
        </div>
        <div class="title-start">Click or press any key to start</div>
      </div>
    `);
    root.appendChild(this.el);
    this.active = true;

    const start = (e) => {
      if (!this.active) return;
      if (e.type === 'keydown' && ['Tab', 'F5', 'F12'].includes(e.code)) return;
      this.active = false;
      window.removeEventListener('pointerdown', start);
      window.removeEventListener('keydown', start);
      this.el.classList.add('hidden');
      setTimeout(() => this.el.remove(), 800);
      onStart();
    };
    window.addEventListener('pointerdown', start);
    window.addEventListener('keydown', start);
  }
}
