// In-game chat (multiplayer): T to type, Enter to send, Esc to cancel.
// The log fades out when idle and comes back when something new arrives.
// All text is inserted with textContent, never as HTML.

import { el } from './format.js';

const MAX_LINES = 60;
const FADE_AFTER = 9000;

export class Chat {
  // canOpen(): whether T / Enter may open the chat right now (not in a menu, etc.).
  constructor(root, onSend, canOpen = () => true) {
    this.onSend = onSend;
    this.el = el(`
      <div class="chat">
        <div class="chat-log"></div>
        <form class="chat-form">
          <input class="chat-input" maxlength="200" placeholder="Say something… (Enter to send, Esc to close)" autocomplete="off" />
        </form>
      </div>
    `);
    this.log = this.el.querySelector('.chat-log');
    this.form = this.el.querySelector('.chat-form');
    this.input = this.el.querySelector('.chat-input');
    root.appendChild(this.el);
    this.isOpen = false;
    this.lastActivity = 0;

    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = this.input.value.trim();
      if (text) this.onSend(text);
      this.close();
    });
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
      }
    });
    setInterval(() => this.updateFade(), 500);

    // Open straight from the key event (not the next game frame), so fast typists don't
    // lose their first letters; preventDefault stops the T itself landing in the box.
    window.addEventListener('keydown', (e) => {
      if (this.isOpen || e.repeat || (e.code !== 'KeyT' && e.code !== 'Enter')) return;
      if (e.target instanceof HTMLElement && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
      if (!canOpen()) return;
      e.preventDefault();
      this.open();
    });
  }

  open() {
    this.isOpen = true;
    this.el.classList.add('open');
    this.input.value = '';
    this.input.focus();
    this.updateFade();
  }

  close() {
    this.isOpen = false;
    this.el.classList.remove('open');
    this.input.blur();
    this.lastActivity = performance.now();
  }

  // name: null for system messages.
  add(name, text, { system = false, self = false } = {}) {
    const line = document.createElement('div');
    line.className = `chat-line${system ? ' system' : ''}${self ? ' self' : ''}`;
    if (name) {
      const who = document.createElement('b');
      who.textContent = `${name}: `;
      line.appendChild(who);
    }
    line.appendChild(document.createTextNode(text));
    this.log.appendChild(line);
    while (this.log.children.length > MAX_LINES) this.log.firstChild.remove();
    this.log.scrollTop = this.log.scrollHeight;
    this.lastActivity = performance.now();
    this.updateFade();
  }

  updateFade() {
    const idle = performance.now() - this.lastActivity > FADE_AFTER;
    this.el.classList.toggle('faded', idle && !this.isOpen);
  }
}
