// Keyboard + mouse state. Systems read from this each frame
// instead of registering their own listeners.

const ACTION = ['Space', 'Mouse0']; // the one "do the thing" button: cast, hook, reel

export class Input {
  constructor(target = window) {
    this.down = new Set();
    this.pressed = new Set(); // went down this frame
    this.released = new Set(); // went up this frame
    this.wheel = 0;
    this.enabled = true; // false while a menu is open: gameplay helpers report nothing

    const press = (code) => {
      if (this.down.has(code)) return;
      this.down.add(code);
      this.pressed.add(code);
    };
    const release = (code) => {
      if (!this.down.has(code)) return;
      this.down.delete(code);
      this.released.add(code);
    };

    // Typing in a text field (name, save code) must not move the player or open menus.
    const typing = (e) => e.target instanceof HTMLElement && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName));
    target.addEventListener('keydown', (e) => {
      if (typing(e)) return;
      if (e.code === 'Space') e.preventDefault();
      if (!e.repeat) press(e.code);
    });
    target.addEventListener('keyup', (e) => release(e.code));
    // Only clicks/scrolls on the game canvas count, so UI buttons and lists don't leak into gameplay.
    const onCanvas = (e) => e.target instanceof HTMLCanvasElement;
    target.addEventListener('pointerdown', (e) => e.button === 0 && onCanvas(e) && press('Mouse0'));
    target.addEventListener('pointerup', (e) => e.button === 0 && release('Mouse0'));
    target.addEventListener('contextmenu', (e) => e.preventDefault());
    target.addEventListener('blur', () => {
      for (const code of this.down) this.released.add(code);
      this.down.clear();
    });
    target.addEventListener(
      'wheel',
      (e) => {
        if (!onCanvas(e)) return;
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

  wasReleased(...codes) {
    return codes.some((c) => this.released.has(c));
  }

  get actionDown() {
    return this.enabled && this.isDown(...ACTION);
  }

  get actionPressed() {
    return this.enabled && this.wasPressed(...ACTION);
  }

  get actionReleased() {
    return this.enabled && this.wasReleased(...ACTION) && !this.isDown(...ACTION);
  }

  // Movement axes in camera space: x = right, y = forward.
  getMoveAxis() {
    if (!this.enabled) return { x: 0, y: 0 };
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
    const w = this.enabled ? this.wheel : 0;
    this.wheel = 0;
    this.enabled = true; // false while a menu is open: gameplay helpers report nothing
    return w;
  }

  // Call at the end of each frame.
  endFrame() {
    this.pressed.clear();
    this.released.clear();
  }
}
