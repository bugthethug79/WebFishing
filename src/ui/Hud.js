// Always-on overlay: title, bucket/journal buttons, controls hint.

import { el } from './format.js';

export class Hud {
  constructor(root, collection, state) {
    this.root = root;
    root.append(
      el(`
        <div class="hud-left">
          <div class="hud-title">WebFishing</div>
          <div class="hud-wallet">
            <div class="chip money"><span class="chip-icon">🪙</span><span class="money-value"></span></div>
            <button class="chip bait" title="Change bait (R)"><span class="chip-icon bait-icon"></span><span class="bait-value"></span><kbd>R</kbd></button>
          </div>
        </div>
      `),
      el(`
        <div class="hud-buttons">
          <button class="hud-btn" data-panel="bucket"><span class="hud-btn-icon">🪣</span><span class="hud-btn-text bucket-count"></span><kbd>B</kbd></button>
          <button class="hud-btn" data-panel="journal"><span class="hud-btn-icon">📖</span><span class="hud-btn-text journal-count"></span><kbd>J</kbd></button>
          <button class="hud-btn icon-only" data-panel="pause" aria-label="Pause and settings"><span class="hud-btn-icon">⚙️</span></button>
        </div>
      `),
      el(`
        <div class="hud-controls">
          <span><kbd>WASD</kbd>Move</span>
          <span><kbd>Shift</kbd>Run</span>
          <span><kbd>Space</kbd>/<kbd>Click</kbd>Fish</span>
          <span><kbd>F</kbd>Interact</span>
          <span><kbd>Q</kbd><kbd>E</kbd>Rotate</span>
          <span><kbd>Scroll</kbd>Zoom</span>
        </div>
      `),
    );
    this.controls = root.querySelector('.hud-controls');
    this.idleTimer = 0;

    this.buttons = root.querySelector('.hud-buttons');
    this.buttons.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-panel]');
      if (!btn) return;
      btn.blur(); // otherwise Space (cast) would "click" the focused button again
      this.onPanelRequest?.(btn.dataset.panel);
    });

    const bucketCount = root.querySelector('.bucket-count');
    const journalCount = root.querySelector('.journal-count');
    const { inventory, journal } = collection;
    const refresh = () => {
      bucketCount.textContent = `${inventory.items.length}/${inventory.capacity}`;
      bucketCount.parentElement.classList.toggle('full', inventory.isFull);
      journalCount.textContent = `${journal.discoveredCount}/${journal.total}`;
    };
    inventory.on('change', (inv) => {
      refresh();
      this.bump(bucketCount.parentElement);
    });
    journal.on('change', refresh);
    refresh();

    // Money + bait.
    const wallet = root.querySelector('.hud-wallet');
    this.moneyChip = wallet.querySelector('.chip.money');
    const moneyValue = wallet.querySelector('.money-value');
    const baitIcon = wallet.querySelector('.bait-icon');
    const baitValue = wallet.querySelector('.bait-value');
    wallet.querySelector('.chip.bait').addEventListener('click', (e) => {
      e.currentTarget.blur();
      state.cycleBait();
    });
    const refreshState = (change) => {
      moneyValue.textContent = state.money.toLocaleString();
      const bait = state.equippedBait;
      baitIcon.textContent = bait.icon;
      baitValue.textContent = bait.id ? `${bait.name} ×${state.bait[bait.id]}` : bait.name;
      if (change?.what === 'money') {
        this.bump(this.moneyChip);
        this.floatText(change.delta);
      }
    };
    state.on('change', refreshState);
    refreshState();
  }

  // "+45" / "-250" that drifts up from the money chip.
  floatText(delta) {
    const f = el(`<div class="money-float ${delta < 0 ? 'neg' : ''}">${delta > 0 ? '+' : ''}${delta}</div>`);
    this.moneyChip.appendChild(f);
    setTimeout(() => f.remove(), 1200);
  }

  bump(btn) {
    btn.classList.remove('bump');
    void btn.offsetWidth; // restart the animation
    btn.classList.add('bump');
  }

  setControlsVisible(visible) {
    this.controls.style.display = visible ? '' : 'none';
  }

  update(dt, input) {
    // Fade the controls hint once the player has started moving around.
    if (input.down.size > 0) this.idleTimer += dt;
    if (this.idleTimer > 4) this.controls.classList.add('faded');
  }
}
