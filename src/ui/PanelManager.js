// Opens/closes full-screen menu panels (bucket, journal). Only one at a time.

export class PanelManager {
  constructor(root) {
    this.overlay = document.createElement('div');
    this.overlay.className = 'panel-overlay';
    this.overlay.addEventListener('pointerdown', (e) => {
      if (e.target === this.overlay) this.close();
    });
    root.appendChild(this.overlay);
    this.panels = {};
    this.current = null;
  }

  register(name, panel) {
    this.panels[name] = panel;
    panel.el.classList.add('panel');
    panel.el.querySelector('.panel-close')?.addEventListener('click', () => this.close());
    this.overlay.appendChild(panel.el);
  }

  get isOpen() {
    return this.current !== null;
  }

  open(name) {
    if (this.current) this.panels[this.current].el.classList.remove('visible');
    this.current = name;
    this.panels[name].render();
    this.panels[name].el.classList.add('visible');
    this.overlay.classList.add('visible');
  }

  close() {
    if (!this.current) return;
    this.panels[this.current].el.classList.remove('visible');
    this.overlay.classList.remove('visible');
    this.current = null;
    document.activeElement?.blur?.(); // keep Space for casting, not for focused panel buttons
  }

  toggle(name) {
    if (this.current === name) this.close();
    else this.open(name);
  }
}
