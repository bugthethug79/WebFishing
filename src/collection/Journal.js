// Per-species catch records: discovered, count, biggest, first caught.

import { Emitter } from '../core/Emitter.js';
import { FISH, FISH_BY_ID } from './fishData.js';

export class Journal extends Emitter {
  constructor() {
    super();
    this.records = {}; // speciesId -> { count, biggest, heaviest, firstCaught }
  }

  toJSON() {
    return { records: structuredClone(this.records) };
  }

  fromJSON(data) {
    if (!data) return;
    this.records = Object.fromEntries(Object.entries(data.records ?? {}).filter(([id]) => FISH_BY_ID[id]));
    this.emit('change', this);
  }

  get discoveredCount() {
    return Object.keys(this.records).length;
  }

  get total() {
    return FISH.length;
  }

  get(speciesId) {
    return this.records[speciesId] ?? null;
  }

  // Returns { isNew, isRecord } so the catch card can celebrate.
  record(c) {
    const id = c.species.id;
    const prev = this.records[id];
    const isNew = !prev;
    const isRecord = !isNew && c.size > prev.biggest;
    this.records[id] = {
      count: (prev?.count ?? 0) + 1,
      biggest: Math.max(prev?.biggest ?? 0, c.size),
      heaviest: Math.max(prev?.heaviest ?? 0, c.weight),
      firstCaught: prev?.firstCaught ?? Date.now(),
    };
    this.emit('change', this);
    return { isNew, isRecord };
  }
}
