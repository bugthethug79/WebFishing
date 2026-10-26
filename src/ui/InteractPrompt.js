// Floating "[F] Read" bubble above whatever the player can interact with.

import { el } from './format.js';

export class InteractPrompt {
  constructor(root) {
    this.el = el('<div class="interact-prompt"><kbd>F</kbd><span></span></div>');
    this.label = this.el.querySelector('span');
    root.appendChild(this.el);
  }

  show(verb, x, y) {
    this.label.textContent = verb;
    this.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
    this.el.classList.add('visible');
  }

  hide() {
    this.el.classList.remove('visible');
  }
}
