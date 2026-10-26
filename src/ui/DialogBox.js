// Speech box at the bottom of the screen with a typewriter effect.
// Advance with Space / F / Enter / click; the last page closes it.

import { el } from './format.js';

const CHARS_PER_SECOND = 45;

export class DialogBox {
  constructor(root) {
    this.el = el(`
      <div class="dialog">
        <div class="dialog-name"></div>
        <div class="dialog-text"></div>
        <div class="dialog-next">▼</div>
      </div>
    `);
    this.nameEl = this.el.querySelector('.dialog-name');
    this.textEl = this.el.querySelector('.dialog-text');
    this.el.addEventListener('pointerdown', () => (this.clicked = true));
    root.appendChild(this.el);
    this.isOpen = false;
    this.onTalk = null; // blip while text types out
    this.onClose = null;
  }

  open({ name, pages }) {
    this.pages = pages;
    this.page = 0;
    this.nameEl.textContent = name;
    this.isOpen = true;
    this.el.classList.add('visible');
    this.startPage();
  }

  startPage() {
    this.typed = 0;
    this.lastBlip = 0;
    this.textEl.textContent = '';
    this.el.classList.remove('done');
  }

  close() {
    this.isOpen = false;
    this.el.classList.remove('visible');
    this.onClose?.();
  }

  update(dt, input) {
    if (!this.isOpen) return;
    const text = this.pages[this.page];
    const advance = input.wasPressed('Space', 'KeyF', 'Enter', 'Mouse0') || this.clicked;
    this.clicked = false;

    if (this.typed < text.length) {
      if (advance) {
        this.typed = text.length; // skip the typing
      } else {
        this.typed = Math.min(text.length, this.typed + dt * CHARS_PER_SECOND);
        if (Math.floor(this.typed / 3) !== this.lastBlip) {
          this.lastBlip = Math.floor(this.typed / 3);
          this.onTalk?.();
        }
      }
      this.textEl.textContent = text.slice(0, Math.floor(this.typed));
      if (this.typed >= text.length) this.el.classList.add('done');
      return;
    }

    if (advance) {
      this.page++;
      if (this.page >= this.pages.length) this.close();
      else this.startPage();
    }
  }
}
