// Title screen. New players pick a name; returning players just continue.
// Starting is also the user gesture that unlocks audio.

import { el } from './format.js';
import { NAME_MAX } from '../save/Profile.js';

export class TitleScreen {
  // profile: { name, isNew }. onStart(name) is called once.
  constructor(root, profile, onStart) {
    this.el = el(`
      <div class="title-screen">
        <div class="title-logo">
          <span class="title-fish">🎣</span>
          <h1>WebFishing</h1>
          <p>A cozy little fishing game</p>
        </div>
        ${
          profile.isNew
            ? `<form class="title-new">
                 <label for="title-name">What should we call you?</label>
                 <input id="title-name" maxlength="${NAME_MAX}" placeholder="Your name" autocomplete="off" />
                 <button class="btn" type="submit">Start fishing</button>
               </form>`
            : `<div class="title-welcome">Welcome back, <b></b>!</div>
               <div class="title-start">Click or press any key to continue</div>`
        }
      </div>
    `);
    root.appendChild(this.el);
    this.active = true;

    const finish = (name) => {
      if (!this.active) return;
      this.active = false;
      window.removeEventListener('pointerdown', onAny);
      window.removeEventListener('keydown', onAny);
      this.el.classList.add('hidden');
      setTimeout(() => this.el.remove(), 800);
      onStart(name);
    };

    if (profile.isNew) {
      const form = this.el.querySelector('form');
      const input = form.querySelector('input');
      setTimeout(() => input.focus(), 300);
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        input.blur();
        finish(input.value);
      });
    } else {
      this.el.querySelector('.title-welcome b').textContent = profile.name;
    }

    // Returning players: any click or key continues.
    const onAny = (e) => {
      if (profile.isNew) return;
      if (e.type === 'keydown' && ['Tab', 'F5', 'F12'].includes(e.code)) return;
      finish(profile.name);
    };
    window.addEventListener('pointerdown', onAny);
    window.addEventListener('keydown', onAny);
  }
}
