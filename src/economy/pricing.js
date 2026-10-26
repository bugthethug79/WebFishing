// Fish sell prices: base species price scaled by how big this one is for its species.

import { FISH_BY_ID } from '../collection/fishData.js';

export function fishPrice(speciesId, size) {
  const s = FISH_BY_ID[speciesId];
  const [min, max] = s.size;
  const t = max > min ? (size - min) / (max - min) : 0.5;
  return Math.max(1, Math.round(s.price * (0.7 + 0.6 * t)));
}
