// Money and gear the player owns / has equipped. Plain data so it can be saved later.

import { Emitter } from '../core/Emitter.js';
import { RODS, BAITS, HATS, NO_BAIT, byId } from './items.js';

export class PlayerState extends Emitter {
  constructor() {
    super();
    this.money = 20;
    this.ownedRods = new Set(['bamboo']);
    this.rodId = 'bamboo';
    this.bait = Object.fromEntries(BAITS.map((b) => [b.id, 0]));
    this.baitId = null;
    this.ownedHats = new Set(['bucket']);
    this.hatId = 'bucket';
  }

  // ---- save / sync ----
  toJSON() {
    return {
      money: this.money,
      ownedRods: [...this.ownedRods],
      rodId: this.rodId,
      bait: { ...this.bait },
      baitId: this.baitId,
      ownedHats: [...this.ownedHats],
      hatId: this.hatId,
    };
  }

  // Unknown ids (e.g. an item removed in a later version) are dropped instead of breaking the save.
  fromJSON(data) {
    if (!data) return;
    const rodIds = new Set(RODS.map((r) => r.id));
    const hatIds = new Set(HATS.map((h) => h.id));
    this.money = Math.max(0, Math.floor(data.money ?? this.money));
    this.ownedRods = new Set(['bamboo', ...(data.ownedRods ?? []).filter((id) => rodIds.has(id))]);
    this.rodId = this.ownedRods.has(data.rodId) ? data.rodId : 'bamboo';
    for (const b of BAITS) this.bait[b.id] = Math.max(0, Math.floor(data.bait?.[b.id] ?? 0));
    this.baitId = data.baitId && this.bait[data.baitId] > 0 ? data.baitId : null;
    this.ownedHats = new Set(['bucket', ...(data.ownedHats ?? []).filter((id) => hatIds.has(id))]);
    this.hatId = this.ownedHats.has(data.hatId) ? data.hatId : 'bucket';
    this.changed('load');
    this.changed('rod');
    this.changed('hat');
  }

  get rod() {
    return byId(RODS, this.rodId);
  }

  get equippedBait() {
    return this.baitId ? byId(BAITS, this.baitId) : NO_BAIT;
  }

  get hat() {
    return byId(HATS, this.hatId);
  }

  changed(what, extra) {
    this.emit('change', { what, ...extra });
  }

  earn(amount) {
    this.money += amount;
    this.changed('money', { delta: amount });
  }

  spend(amount) {
    if (this.money < amount) return false;
    this.money -= amount;
    this.changed('money', { delta: -amount });
    return true;
  }

  // ---- rods ----
  buyRod(id) {
    const rod = byId(RODS, id);
    if (this.ownedRods.has(id) || !this.spend(rod.price)) return false;
    this.ownedRods.add(id);
    this.equipRod(id);
    return true;
  }

  equipRod(id) {
    if (!this.ownedRods.has(id)) return;
    this.rodId = id;
    this.changed('rod');
  }

  // ---- bait ----
  buyBait(id) {
    const b = byId(BAITS, id);
    if (!this.spend(b.price)) return false;
    this.bait[id] += b.pack;
    if (!this.baitId) this.baitId = id; // auto-equip the first bait you buy
    this.changed('bait');
    return true;
  }

  equipBait(id) {
    if (id && !this.bait[id]) return;
    this.baitId = id;
    this.changed('bait');
  }

  // Cycles through baits you have, plus "no bait".
  cycleBait() {
    const options = [null, ...BAITS.filter((b) => this.bait[b.id] > 0).map((b) => b.id)];
    const i = options.indexOf(this.baitId);
    this.equipBait(options[(i + 1) % options.length]);
  }

  // Uses one of the equipped bait. Returns { bait, ranOut }.
  useBait() {
    const bait = this.equippedBait;
    if (!bait.id) return { bait, ranOut: false };
    this.bait[bait.id]--;
    const ranOut = this.bait[bait.id] <= 0;
    if (ranOut) this.baitId = null;
    this.changed('bait');
    return { bait, ranOut };
  }

  // ---- hats ----
  buyHat(id) {
    const hat = byId(HATS, id);
    if (this.ownedHats.has(id) || !this.spend(hat.price)) return false;
    this.ownedHats.add(id);
    this.equipHat(id);
    return true;
  }

  equipHat(id) {
    if (!this.ownedHats.has(id)) return;
    this.hatId = id;
    this.changed('hat');
  }
}
