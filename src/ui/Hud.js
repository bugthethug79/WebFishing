// Always-on overlay: title, bucket/journal buttons, controls hint.

import { el } from './format.js';

export class Hud {
  constructor(root, collection, panels) {
    this.root = root;
    root.append(
      el('<div class="hud-title">WebFishing</div>'),
      el(`
        <div class="hud-buttons">
          <button class="hud-btn" data-panel="bucket"><span class="hud-btn-icon">🪣</span><span class="hud-btn-text bucket-count"></span><kbd>B</kbd></button>
          <button class="hud-btn" data-panel="journal"><span class="hud-btn-icon">📖</span><span class="hud-btn-text journal-count"></span><kbd>J</kbd></button>
        </div>
      `),
      el(`
        <div class="hud-controls">
          <span><kbd>WASD</kbd>Move</span>
          <span><kbd>Shift</kbd>Run</span>
          <span><kbd>Space</kbd>/<kbd>Click</kbd>Fish</span>
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
  }

  bump(btn) {
    btn.classList.remove('bump');
    void btn.offsetWidth; // restart the animation
    btn.classList.add('bump');
  }

  update(dt, input) {
    // Fade the controls hint once the player has started moving around.
    if (input.down.size > 0) this.idleTimer += dt;
    if (this.idleTimer > 4) this.controls.classList.add('faded');
  }
}
