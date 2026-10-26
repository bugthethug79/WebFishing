// Shown when the server connection drops: "reconnecting…", or a way back to the title.

import { el } from './format.js';

export class ConnectionOverlay {
  constructor(root) {
    this.el = el(`
      <div class="conn-overlay">
        <div class="conn-card">
          <div class="conn-spinner">🎣</div>
          <div class="conn-text"></div>
          <button class="btn conn-back" hidden>Back to title</button>
        </div>
      </div>
    `);
    this.el.querySelector('.conn-back').addEventListener('click', () => location.reload());
    root.appendChild(this.el);
  }

  get isOpen() {
    return this.el.classList.contains('visible');
  }

  reconnecting(reason) {
    this.el.querySelector('.conn-text').textContent = `${reason} Reconnecting…`;
    this.el.querySelector('.conn-back').hidden = false;
    this.el.querySelector('.conn-spinner').classList.add('spin');
    this.el.classList.add('visible');
  }

  ended(reason) {
    this.el.querySelector('.conn-text').textContent = reason;
    this.el.querySelector('.conn-back').hidden = false;
    this.el.querySelector('.conn-spinner').classList.remove('spin');
    this.el.classList.add('visible');
  }

  hide() {
    this.el.classList.remove('visible');
  }
}
