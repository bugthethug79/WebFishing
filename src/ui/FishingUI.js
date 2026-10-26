import { formatWeight } from '../collection/fishData.js';

// DOM widgets for the fishing loop: power meter, bite alert, reel minigame, catch card, toasts.

export class FishingUI {
  constructor(root) {
    const el = document.createElement('div');
    el.className = 'fishing-ui';
    el.innerHTML = `
      <div class="anchor">
        <div class="power"><div class="power-fill"></div></div>
        <div class="aim-label"></div>
        <div class="bite">!</div>
      </div>
      <div class="reel">
        <div class="reel-title">Reel it in!</div>
        <div class="reel-row">
          <span class="reel-label">Catch</span>
          <div class="bar progress"><div class="bar-fill"></div><div class="fish-icon">🐟</div></div>
        </div>
        <div class="reel-row">
          <span class="reel-label">Tension</span>
          <div class="bar tension"><div class="zone-safe"></div><div class="zone-danger"></div><div class="needle"></div></div>
        </div>
        <div class="reel-hint">Hold <kbd>Space</kbd> / <kbd>Click</kbd> to reel, let go when the line gets tight</div>
      </div>
      <div class="catch-card">
        <div class="catch-badges"></div>
        <div class="catch-new">You caught a</div>
        <div class="catch-name"></div>
        <div class="catch-meta"><span class="catch-rarity"></span><span class="catch-size"></span></div>
        <div class="catch-note"></div>
        <div class="catch-hint">Press <kbd>Space</kbd> to continue</div>
      </div>
      <div class="toast"></div>
    `;
    root.appendChild(el);

    this.anchor = el.querySelector('.anchor');
    this.power = el.querySelector('.power');
    this.powerFill = el.querySelector('.power-fill');
    this.bite = el.querySelector('.bite');
    this.aimLabel = el.querySelector('.aim-label');
    this.reel = el.querySelector('.reel');
    this.progressFill = el.querySelector('.progress .bar-fill');
    this.fishIcon = el.querySelector('.fish-icon');
    this.tensionBar = el.querySelector('.tension');
    this.needle = el.querySelector('.needle');
    this.card = el.querySelector('.catch-card');
    this.toastEl = el.querySelector('.toast');
    this.toastTimer = null;
  }

  // Screen-space point above the player's head that floating widgets follow.
  setAnchor(x, y) {
    this.anchor.style.transform = `translate(${x}px, ${y}px)`;
  }

  setPower(value) {
    this.power.classList.toggle('visible', value !== null);
    if (value !== null) {
      this.powerFill.style.height = `${value * 100}%`;
      this.powerFill.style.background = `hsl(${120 - value * 110}, 85%, 55%)`;
    }
  }

  // Habitat name under the cursor while charging, or null to hide.
  setAim(text, ok = true) {
    this.aimLabel.classList.toggle('visible', text !== null);
    if (text === null) return;
    this.aimLabel.textContent = text;
    this.aimLabel.classList.toggle('bad', !ok);
  }

  setBite(visible) {
    this.bite.classList.toggle('visible', visible);
  }

  setReel(state) {
    this.reel.classList.toggle('visible', !!state);
    if (!state) return;
    this.progressFill.style.width = `${state.progress * 100}%`;
    this.fishIcon.style.left = `${state.progress * 100}%`;
    this.needle.style.left = `${state.tension * 100}%`;
    this.tensionBar.classList.toggle('thrash', state.thrashing);
    this.tensionBar.classList.toggle('danger', state.tension > 0.85);
  }

  // result: { isNew, isRecord, stored } from the collection.
  showCatch(c, result = {}) {
    this.card.querySelector('.catch-name').textContent = c.species.name;
    const rarity = this.card.querySelector('.catch-rarity');
    rarity.textContent = c.rarity.label;
    rarity.style.background = c.rarity.color;
    this.card.querySelector('.catch-size').textContent = `${c.size} cm · ${formatWeight(c.weight)}`;

    const badges = [];
    if (result.isNew) badges.push('<span class="badge new">NEW!</span>');
    if (result.isRecord) badges.push('<span class="badge record">New record!</span>');
    this.card.querySelector('.catch-badges').innerHTML = badges.join('');

    const note = this.card.querySelector('.catch-note');
    note.textContent = result.stored === false ? 'Your bucket is full, so it swam back home.' : result.isNew ? 'Added to your journal' : '';
    note.classList.toggle('warn', result.stored === false);

    this.card.classList.toggle('legendary', c.rarity.id === 'legendary');
    this.card.classList.add('visible');
  }

  hideCatch() {
    this.card.classList.remove('visible');
  }

  toast(text, duration = 1800) {
    this.toastEl.textContent = text;
    this.toastEl.classList.add('visible');
    this.onToast?.();
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastEl.classList.remove('visible'), duration);
  }
}
