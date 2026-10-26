// Fish journal: every species, silhouettes for undiscovered ones, records for the rest.

import { FISH, FISH_BY_ID, RARITY, HABITATS, TIME_LABEL, WEATHER_LABEL, formatWeight } from '../collection/fishData.js';
import { ZONES, ZONES_BY_ID } from '../world/zones/index.js';
import { getFishIcon } from './fishIcons.js';
import { el } from './format.js';

export class JournalPanel {
  constructor(journal) {
    this.journal = journal;
    this.selected = FISH[0].id;
    this.el = el(`
      <div class="journal-panel">
        <div class="panel-header">
          <div class="panel-title">📖 Journal <span class="panel-sub count"></span></div>
          <div class="journal-progress"><div class="journal-progress-fill"></div></div>
          <button class="panel-close" aria-label="Close">✕</button>
        </div>
        <div class="panel-body">
          <div class="species-grid"></div>
          <div class="detail"></div>
        </div>
        <div class="panel-footer">Press <kbd>J</kbd> or <kbd>Esc</kbd> to close</div>
      </div>
    `);
    this.grid = this.el.querySelector('.species-grid');
    this.detail = this.el.querySelector('.detail');
    this.count = this.el.querySelector('.count');
    this.progress = this.el.querySelector('.journal-progress-fill');
    journal.on('change', () => this.el.classList.contains('visible') && this.render());
  }

  render() {
    const { journal } = this;
    this.count.textContent = `${journal.discoveredCount} / ${journal.total} discovered`;
    this.progress.style.width = `${(journal.discoveredCount / journal.total) * 100}%`;

    // Grouped by zone, with a heading per zone.
    let n = 0;
    const cards = [];
    for (const zone of ZONES) {
      const fish = FISH.filter((f) => f.zones[0] === zone.id);
      const found = fish.filter((f) => journal.get(f.id)).length;
      cards.push(el(`<div class="species-heading">${zone.name} <span>${found} / ${fish.length}</span></div>`));
      for (const species of fish) cards.push(this.card(species, n++));
    }
    this.grid.replaceChildren(...cards);
    this.renderDetail();
  }

  card(species, i) {
    const found = !!this.journal.get(species.id);
    const card = el(`
      <button class="species ${found ? '' : 'unknown'} ${species.id === this.selected ? 'selected' : ''}"
              style="--rarity:${RARITY[species.rarity].color}">
        <span class="species-num">#${String(i + 1).padStart(2, '0')}</span>
        <img src="${getFishIcon(species.id)}" alt="" />
        <span class="species-name">${found ? species.name : '???'}</span>
      </button>
    `);
    card.addEventListener('click', () => {
      this.selected = species.id;
      this.render();
    });
    return card;
  }

  renderDetail() {
    const { journal } = this;
    const species = FISH_BY_ID[this.selected];
    const rec = journal.get(species.id);
    const rarity = RARITY[species.rarity];
    const habitats = species.habitats.map((h) => HABITATS[h].label).join(', ');
    const zone = species.zones.map((z) => ZONES_BY_ID[z].name).join(', ');
    const when = [TIME_LABEL[species.time], WEATHER_LABEL[species.weather]].filter(Boolean).join(', ') || 'Any time';

    this.detail.replaceChildren(
      el(`
        <div class="detail-inner">
          <img class="detail-icon ${rec ? '' : 'unknown'}" src="${getFishIcon(species.id)}" alt="" />
          <div class="detail-name">${rec ? species.name : '???'}</div>
          <span class="pill" style="background:${rarity.color}">${rarity.label}</span>
          <p class="description">${rec ? species.description : 'Not discovered yet. Keep fishing!'}</p>
          <dl class="stats">
            <dt>Where</dt><dd>${zone}</dd>
            <dt>Water</dt><dd>${habitats}</dd>
            <dt>When</dt><dd>${when}</dd>
            ${
              rec
                ? `<dt>Caught</dt><dd>${rec.count}×</dd>
                   <dt>Biggest</dt><dd>${rec.biggest} cm</dd>
                   <dt>Heaviest</dt><dd>${formatWeight(rec.heaviest)}</dd>`
                : `<dt>Tip</dt><dd>${species.habitats.map((h) => HABITATS[h].hint).join(' or ')}</dd>`
            }
          </dl>
        </div>
      `),
    );
  }
}
