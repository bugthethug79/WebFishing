// Travel menu opened from a rowboat: pick a zone to sail to.

import { ZONES } from '../world/zones/index.js';
import { FISH } from '../collection/fishData.js';
import { el } from './format.js';

export class TravelPanel {
  constructor(journal, getCurrentZone, onTravel) {
    this.journal = journal;
    this.getCurrentZone = getCurrentZone;
    this.el = el(`
      <div class="travel-panel">
        <div class="panel-header">
          <div class="panel-title">⛵ Where to?</div>
          <button class="panel-close" aria-label="Close">✕</button>
        </div>
        <div class="panel-body travel-body"></div>
        <div class="panel-footer">Press <kbd>Esc</kbd> to stay here</div>
      </div>
    `);
    this.body = this.el.querySelector('.travel-body');
    this.body.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-zone]');
      if (btn && !btn.disabled) onTravel(btn.dataset.zone);
    });
  }

  render() {
    const current = this.getCurrentZone();
    this.body.replaceChildren(
      ...ZONES.map((zone) => {
        const fish = FISH.filter((f) => f.zones.includes(zone.id));
        const found = fish.filter((f) => this.journal.get(f.id)).length;
        const here = zone.id === current;
        return el(`
          <div class="zone-card zone-${zone.id} ${here ? 'here' : ''}">
            <div class="zone-card-art"></div>
            <div class="zone-card-name">${zone.name}</div>
            <div class="zone-card-sub">${zone.subtitle}</div>
            <p class="zone-card-desc">${zone.description}</p>
            <div class="zone-card-fish">🐟 ${found} / ${fish.length} fish discovered</div>
            <button class="btn" data-zone="${zone.id}" ${here ? 'disabled' : ''}>${here ? 'You are here' : 'Sail here'}</button>
          </div>
        `);
      }),
    );
  }
}
