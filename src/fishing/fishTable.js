// Placeholder species list so the fishing loop has something to catch.
// Milestone 3 replaces this with full fish data (habitats, times, journal...).

export const RARITY = {
  common: { label: 'Common', color: '#7ccf5a', weight: 60 },
  uncommon: { label: 'Uncommon', color: '#4fb3ff', weight: 28 },
  rare: { label: 'Rare', color: '#b07cff', weight: 10 },
  legendary: { label: 'Legendary', color: '#ffb52e', weight: 2 },
};

// strength (0..1) drives how hard the fish fights in the reeling minigame.
export const FISH = [
  { id: 'minnow', name: 'Minnow', rarity: 'common', size: [5, 10], strength: 0.15, color: 0x9fb8c8, fin: 0x6f8fa3 },
  { id: 'bluegill', name: 'Bluegill', rarity: 'common', size: [12, 24], strength: 0.3, color: 0x5fa8d9, fin: 0xf2a33a },
  { id: 'sardine', name: 'Sardine', rarity: 'common', size: [10, 20], strength: 0.25, color: 0xb9d4e0, fin: 0x4f7c99 },
  { id: 'pufferfish', name: 'Pufferfish', rarity: 'uncommon', size: [15, 30], strength: 0.45, color: 0xf2d066, fin: 0xc98f3a },
  { id: 'seabass', name: 'Sea Bass', rarity: 'uncommon', size: [30, 60], strength: 0.55, color: 0x6c8c9e, fin: 0x3f5868 },
  { id: 'mahimahi', name: 'Mahi-mahi', rarity: 'rare', size: [60, 110], strength: 0.75, color: 0x4fd18a, fin: 0xffd84d },
  { id: 'koi', name: 'Golden Koi', rarity: 'legendary', size: [50, 90], strength: 0.9, color: 0xffb52e, fin: 0xff6a3d },
];

// depthBonus (0..1): casting into deeper water nudges the odds toward rarer fish.
export function rollFish(rng = Math.random, depthBonus = 0) {
  const weightOf = (f) => {
    const base = RARITY[f.rarity].weight;
    const boost = f.rarity === 'rare' || f.rarity === 'legendary' ? 1 + depthBonus * 1.5 : 1;
    return base * boost;
  };
  const total = FISH.reduce((sum, f) => sum + weightOf(f), 0);
  let roll = rng() * total;
  let species = FISH[0];
  for (const f of FISH) {
    roll -= weightOf(f);
    if (roll <= 0) {
      species = f;
      break;
    }
  }
  const [min, max] = species.size;
  // Bias sizes toward the lower end; big ones feel special.
  const size = Math.round(min + (max - min) * Math.pow(rng(), 1.6));
  return { species, size, rarity: RARITY[species.rarity] };
}
