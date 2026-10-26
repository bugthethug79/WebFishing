// Bucket (inventory) panel: a grid of slots, details for the selected fish, release button.

import { FISH_BY_ID, RARITY, formatWeight } from '../collection/fishData.js';
import { getFishIcon } from './fishIcons.js';
import { el, timeAgo } from './format.js';

export class BucketPanel {
  constructor(inventory, onToast) {
    this.inventory = inventory;
    this.onToast = onToast;
    this.selected = null;
    this.el = el(`
      <div class="bucket-panel">
        <div class="panel-header">
          <div class="panel-title">🪣 Bucket <span class="panel-sub count"></span></div>
          <button class="panel-close" aria-label="Close">✕</button>
        </div>
        <div class="panel-body">
          <div class="slot-grid"></div>
          <div class="detail"></div>
        </div>
        <div class="panel-footer">Press <kbd>B</kbd> or <kbd>Esc</kbd> to close</div>
      </div>
    `);
    this.grid = this.el.querySelector('.slot-grid');
    this.detail = this.el.querySelector('.detail');
    this.count = this.el.querySelector('.count');
    inventory.on('change', () => this.el.classList.contains('visible') && this.render());
  }

  render() {
    const { items, capacity } = this.inventory;
    this.count.textContent = `${items.length} / ${capacity}`;
    if (!items.some((it) => it.uid === this.selected)) this.selected = items[0]?.uid ?? null;

    this.grid.replaceChildren(
      ...Array.from({ length: capacity }, (_, i) => {
        const item = items[i];
        if (!item) return el('<div class="slot empty"></div>');
        const species = FISH_BY_ID[item.speciesId];
        const slot = el(`
          <button class="slot ${item.uid === this.selected ? 'selected' : ''}" style="--rarity:${RARITY[species.rarity].color}">
            <img src="${getFishIcon(species.id)}" alt="${species.name}" />
            <span class="slot-size">${item.size}cm</span>
          </button>
        `);
        slot.addEventListener('click', () => {
          this.selected = item.uid;
          this.render();
        });
        return slot;
      }),
    );

    const item = items.find((it) => it.uid === this.selected);
    if (!item) {
      this.detail.innerHTML = `<div class="detail-empty">Your bucket is empty.<br/>Go catch something!</div>`;
      return;
    }
    const species = FISH_BY_ID[item.speciesId];
    const rarity = RARITY[species.rarity];
    this.detail.replaceChildren(
      el(`
        <div class="detail-inner">
          <img class="detail-icon" src="${getFishIcon(species.id)}" alt="" />
          <div class="detail-name">${species.name}</div>
          <span class="pill" style="background:${rarity.color}">${rarity.label}</span>
          <dl class="stats">
            <dt>Length</dt><dd>${item.size} cm</dd>
            <dt>Weight</dt><dd>${formatWeight(item.weight)}</dd>
            <dt>Caught</dt><dd>${timeAgo(item.caughtAt)}</dd>
          </dl>
          <button class="btn release">Release 🌊</button>
        </div>
      `),
    );
    this.detail.querySelector('.release').addEventListener('click', () => {
      this.inventory.remove(item.uid);
      this.onToast?.(`Released the ${species.name}. Bye!`);
    });
  }
}
