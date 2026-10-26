// Marina's shop: sell fish, buy rods / bait / hats, equip what you own.

import { FISH_BY_ID, RARITY, formatWeight } from '../collection/fishData.js';
import { RODS, BAITS, HATS, NO_BAIT } from '../economy/items.js';
import { getFishIcon, getHatIcon, getRodIcon } from './fishIcons.js';
import { el } from './format.js';

const TABS = [
  ['sell', '💰 Sell'],
  ['rods', '🎣 Rods'],
  ['bait', '🪱 Bait'],
  ['hats', '🎩 Hats'],
];

// Stat bars for rods, normalised against the best rod.
const STATS = [
  ['Cast', (r) => (r.cast - 10) / 7],
  ['Reel', (r) => (r.reel - 0.8) / 0.7],
  ['Control', (r) => (1 / r.tension - 0.8) / 1],
  ['Luck', (r) => r.luck / 0.5],
];

export class ShopPanel {
  // events: { onSold(coins, count), onBought(), onEquip(), onCantAfford() }
  constructor(shop, state, events) {
    this.shop = shop;
    this.state = state;
    this.events = events;
    this.tab = 'sell';
    this.selected = null;
    this.confirmSellAll = false;
    this.el = el(`
      <div class="shop-panel">
        <div class="panel-header">
          <div class="panel-title">🐚 Marina's Shop</div>
          <div class="chip money shop-money"><span class="chip-icon">🪙</span><span class="shop-money-value"></span></div>
          <button class="panel-close" aria-label="Close">✕</button>
        </div>
        <div class="tabs">${TABS.map(([id, label]) => `<button class="tab" data-tab="${id}">${label}</button>`).join('')}</div>
        <div class="panel-body shop-body"></div>
        <div class="panel-footer">Press <kbd>Esc</kbd> to close</div>
      </div>
    `);
    this.body = this.el.querySelector('.shop-body');
    this.moneyEl = this.el.querySelector('.shop-money-value');
    this.el.querySelector('.tabs').addEventListener('click', (e) => {
      const t = e.target.closest('[data-tab]');
      if (!t) return;
      this.tab = t.dataset.tab;
      this.confirmSellAll = false;
      this.render();
    });
    const rerender = () => this.el.classList.contains('visible') && this.render();
    state.on('change', rerender);
    shop.inventory.on('change', rerender);
  }

  render() {
    this.moneyEl.textContent = this.state.money.toLocaleString();
    for (const t of this.el.querySelectorAll('.tab')) t.classList.toggle('active', t.dataset.tab === this.tab);
    this.body.className = `panel-body shop-body tab-${this.tab}`;
    this[`render_${this.tab}`]();
  }

  // ---------- Sell ----------
  render_sell() {
    const { items } = this.shop.inventory;
    if (!items.some((it) => it.uid === this.selected)) this.selected = items[0]?.uid ?? null;

    if (!items.length) {
      this.body.replaceChildren(el(`<div class="shop-empty">Your bucket is empty.<br/>Go catch some fish and I'll buy them!</div>`));
      return;
    }

    const grid = el('<div class="slot-grid"></div>');
    for (const item of items) {
      const species = FISH_BY_ID[item.speciesId];
      const slot = el(`
        <button class="slot ${item.uid === this.selected ? 'selected' : ''}" style="--rarity:${RARITY[species.rarity].color}">
          <img src="${getFishIcon(species.id)}" alt="${species.name}" />
          <span class="slot-size">🪙 ${this.shop.priceOf(item)}</span>
        </button>
      `);
      slot.addEventListener('click', () => {
        this.selected = item.uid;
        this.confirmSellAll = false;
        this.render();
      });
      grid.appendChild(slot);
    }

    const item = items.find((it) => it.uid === this.selected);
    const species = FISH_BY_ID[item.speciesId];
    const rarity = RARITY[species.rarity];
    const total = this.shop.totalValue();
    const detail = el(`
      <div class="detail">
        <div class="detail-inner">
          <img class="detail-icon" src="${getFishIcon(species.id)}" alt="" />
          <div class="detail-name">${species.name}</div>
          <span class="pill" style="background:${rarity.color}">${rarity.label}</span>
          <dl class="stats">
            <dt>Length</dt><dd>${item.size} cm</dd>
            <dt>Weight</dt><dd>${formatWeight(item.weight)}</dd>
          </dl>
          <button class="btn sell-one">Sell for 🪙 ${this.shop.priceOf(item)}</button>
          <button class="btn secondary sell-all">${this.confirmSellAll ? `Sure? +🪙 ${total}` : `Sell all (${items.length})`}</button>
        </div>
      </div>
    `);
    detail.querySelector('.sell-one').addEventListener('click', () => {
      const coins = this.shop.sell(item.uid);
      this.events.onSold?.(coins, 1);
    });
    detail.querySelector('.sell-all').addEventListener('click', () => {
      // Two-step so a stray click doesn't sell a legendary.
      if (!this.confirmSellAll) {
        this.confirmSellAll = true;
        this.render();
        return;
      }
      this.confirmSellAll = false;
      const { coins, count } = this.shop.sellMany();
      this.events.onSold?.(coins, count);
    });
    this.body.replaceChildren(grid, detail);
  }

  // ---------- Rods ----------
  render_rods() {
    const s = this.state;
    this.body.replaceChildren(
      ...RODS.map((rod) => {
        const owned = s.ownedRods.has(rod.id);
        const equipped = s.rodId === rod.id;
        const card = el(`
          <div class="shop-card ${equipped ? 'equipped' : ''}">
            <img class="shop-card-icon" src="${getRodIcon(rod)}" alt="" />
            <div class="shop-card-info">
              <div class="shop-card-name">${rod.name}</div>
              <div class="shop-card-desc">${rod.description}</div>
              <div class="stat-bars">
                ${STATS.map(([label, f]) => `
                  <span class="stat-label">${label}</span>
                  <span class="stat-bar"><span style="width:${Math.max(6, Math.min(100, f(rod) * 100))}%"></span></span>`).join('')}
              </div>
            </div>
            ${this.actionButton(owned, equipped, rod.price)}
          </div>
        `);
        card.querySelector('.btn').addEventListener('click', () => {
          if (equipped) return;
          if (owned) {
            s.equipRod(rod.id);
            this.events.onEquip?.();
          } else this.purchase(() => s.buyRod(rod.id), rod.price);
        });
        return card;
      }),
    );
  }

  // ---------- Bait ----------
  render_bait() {
    const s = this.state;
    const none = el(`
      <div class="shop-card ${!s.baitId ? 'equipped' : ''}">
        <div class="shop-card-icon emoji">${NO_BAIT.icon}</div>
        <div class="shop-card-info">
          <div class="shop-card-name">No bait</div>
          <div class="shop-card-desc">Save your bait for when it counts.</div>
        </div>
        <button class="btn ${!s.baitId ? 'equipped-btn' : ''}">${!s.baitId ? 'Using' : 'Use'}</button>
      </div>
    `);
    none.querySelector('.btn').addEventListener('click', () => {
      s.equipBait(null);
      this.events.onEquip?.();
    });

    const cards = BAITS.map((b) => {
      const count = s.bait[b.id];
      const using = s.baitId === b.id;
      const card = el(`
        <div class="shop-card ${using ? 'equipped' : ''}">
          <div class="shop-card-icon emoji">${b.icon}</div>
          <div class="shop-card-info">
            <div class="shop-card-name">${b.name} <span class="owned-count">×${count}</span></div>
            <div class="shop-card-desc">${b.description}</div>
          </div>
          <div class="shop-card-actions">
            <button class="btn buy">Buy ${b.pack} · 🪙 ${b.price}</button>
            <button class="btn secondary use ${using ? 'equipped-btn' : ''}" ${count ? '' : 'disabled'}>${using ? 'Using' : 'Use'}</button>
          </div>
        </div>
      `);
      card.querySelector('.buy').addEventListener('click', () => this.purchase(() => s.buyBait(b.id), b.price));
      card.querySelector('.use').addEventListener('click', () => {
        if (!count) return;
        s.equipBait(b.id);
        this.events.onEquip?.();
      });
      return card;
    });
    this.body.replaceChildren(none, ...cards);
  }

  // ---------- Hats ----------
  render_hats() {
    const s = this.state;
    const grid = el('<div class="hat-grid"></div>');
    for (const hat of HATS) {
      const owned = s.ownedHats.has(hat.id);
      const equipped = s.hatId === hat.id;
      const card = el(`
        <div class="hat-card ${equipped ? 'equipped' : ''}">
          <img src="${getHatIcon(hat.id)}" alt="" />
          <div class="shop-card-name">${hat.name}</div>
          <div class="shop-card-desc">${hat.description}</div>
          ${this.actionButton(owned, equipped, hat.price)}
        </div>
      `);
      card.querySelector('.btn').addEventListener('click', () => {
        if (equipped) return;
        if (owned) {
          s.equipHat(hat.id);
          this.events.onEquip?.();
        } else this.purchase(() => s.buyHat(hat.id), hat.price);
      });
      grid.appendChild(card);
    }
    this.body.replaceChildren(grid);
  }

  actionButton(owned, equipped, price) {
    if (equipped) return '<button class="btn equipped-btn">Equipped</button>';
    if (owned) return '<button class="btn secondary">Equip</button>';
    const cls = this.state.money >= price ? '' : 'cant-afford';
    return `<button class="btn ${cls}">🪙 ${price.toLocaleString()}</button>`;
  }

  purchase(buy, price) {
    if (this.state.money < price || !buy()) {
      this.events.onCantAfford?.();
      return;
    }
    this.events.onBought?.();
  }
}
