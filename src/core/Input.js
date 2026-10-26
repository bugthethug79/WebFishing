// Keyboard + mouse wheel state. Systems read from this each frame
// instead of registering their own listeners.

export class Input {
  constructor(target = window) {
    this.down = new Set();
    this.pressed = new Set(); // keys pressed this frame only
    this.wheel = 0;

    target.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.down.add(e.code);
      this.pressed.add(e.code);
    });
    target.addEventListener('keyup', (e) => this.down.delete(e.code));
    target.addEventListener('blur', () => this.down.clear());
    target.addEventListener(
      'wheel',
      (e) => {
        this.wheel += Math.sign(e.deltaY);
        e.preventDefault();
      },
      { passive: false },
    );
  }

  isDown(...codes) {
    return codes.some((c) => this.down.has(c));
  }

  wasPressed(...codes) {
    return codes.some((c) => this.pressed.has(c));
  }

  // Movement axes in camera space: x = right, y = forward.
  getMoveAxis() {
    let x = 0;
    let y = 0;
    if (this.isDown('KeyW', 'ArrowUp')) y += 1;
    if (this.isDown('KeyS', 'ArrowDown')) y -= 1;
    if (this.isDown('KeyD', 'ArrowRight')) x += 1;
    if (this.isDown('KeyA', 'ArrowLeft')) x -= 1;
    const len = Math.hypot(x, y);
    return len > 0 ? { x: x / len, y: y / len } : { x: 0, y: 0 };
  }

  consumeWheel() {
    const w = this.wheel;
    this.wheel = 0;
    return w;
  }

  // Call at the end of each frame.
  endFrame() {
    this.pressed.clear();
  }
}
