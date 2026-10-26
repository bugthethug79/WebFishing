// Minimal DOM overlay. Will grow into the full UI layer in later milestones.

export class Hud {
  constructor(root) {
    this.root = root;
    root.innerHTML = `
      <div class="hud-title">WebFishing</div>
      <div class="hud-controls">
        <span><kbd>WASD</kbd>Move</span>
        <span><kbd>Shift</kbd>Run</span>
        <span><kbd>Q</kbd><kbd>E</kbd>Rotate</span>
        <span><kbd>Scroll</kbd>Zoom</span>
      </div>
    `;
    this.controls = root.querySelector('.hud-controls');
    this.idleTimer = 0;
  }

  update(dt, input) {
    // Fade the controls hint once the player has started moving around.
    if (input.down.size > 0) this.idleTimer += dt;
    if (this.idleTimer > 4) this.controls.classList.add('faded');
  }
}
