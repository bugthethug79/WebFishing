// Big area name that fades in and out when you arrive somewhere.

import { el } from './format.js';

export class ZoneBanner {
  constructor(root) {
    this.el = el('<div class="zone-banner"><div class="zone-name"></div><div class="zone-sub"></div></div>');
    root.appendChild(this.el);
  }

  show(zone) {
    this.el.querySelector('.zone-name').textContent = zone.name;
    this.el.querySelector('.zone-sub').textContent = zone.subtitle;
    this.el.classList.remove('visible');
    void this.el.offsetWidth;
    this.el.classList.add('visible');
  }
}
