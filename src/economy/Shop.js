// Marina's shop: the transactions between the bucket, the wallet and the gear.

import { fishPrice } from './pricing.js';

export class Shop {
  constructor(inventory, state) {
    this.inventory = inventory;
    this.state = state;
  }

  priceOf(item) {
    return fishPrice(item.speciesId, item.size);
  }

  sell(uid) {
    const item = this.inventory.items.find((it) => it.uid === uid);
    if (!item) return 0;
    const coins = this.priceOf(item);
    this.inventory.remove(uid);
    this.state.earn(coins);
    return coins;
  }

  totalValue(items = this.inventory.items) {
    return items.reduce((sum, it) => sum + this.priceOf(it), 0);
  }

  // Sells every fish in `items` (defaults to the whole bucket). Returns { count, coins }.
  sellMany(items = [...this.inventory.items]) {
    const coins = this.totalValue(items);
    for (const it of items) this.inventory.remove(it.uid);
    if (coins) this.state.earn(coins);
    return { count: items.length, coins };
  }
}
