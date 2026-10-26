// The player's fish bucket. Plain data, so it can be saved later (Milestone 8).

import { Emitter } from '../core/Emitter.js';

export class Inventory extends Emitter {
  constructor(capacity = 20) {
    super();
    this.capacity = capacity;
    this.items = []; // newest first
    this.nextId = 1;
  }

  get isFull() {
    return this.items.length >= this.capacity;
  }

  // Returns the stored item, or null if the bucket is full.
  add(c) {
    if (this.isFull) return null;
    const item = {
      uid: this.nextId++,
      speciesId: c.species.id,
      size: c.size,
      weight: c.weight,
      caughtAt: Date.now(),
    };
    this.items.unshift(item);
    this.emit('change', this);
    return item;
  }

  remove(uid) {
    const i = this.items.findIndex((it) => it.uid === uid);
    if (i === -1) return null;
    const [item] = this.items.splice(i, 1);
    this.emit('change', this);
    return item;
  }
}
