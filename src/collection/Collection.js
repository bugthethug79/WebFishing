// Facade the rest of the game talks to when a fish is caught.

import { Inventory } from './Inventory.js';
import { Journal } from './Journal.js';

export class Collection {
  constructor() {
    this.inventory = new Inventory(20);
    this.journal = new Journal();
  }

  // Records a catch in the journal and tries to put it in the bucket.
  addCatch(c) {
    const { isNew, isRecord } = this.journal.record(c);
    const item = this.inventory.add(c);
    return { isNew, isRecord, stored: !!item };
  }
}
