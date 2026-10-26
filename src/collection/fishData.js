// Every catchable species. This is the single source of truth for fish:
// zones: where it lives. time: 'day' | 'night' (default any). weather: 'rain' (default any).
// the fishing roll, the 3D models, the journal and (later) the shop all read from here.

export const RARITY = {
  common: { id: 'common', label: 'Common', color: '#7ccf5a', weight: 60, order: 0 },
  uncommon: { id: 'uncommon', label: 'Uncommon', color: '#4fb3ff', weight: 28, order: 1 },
  rare: { id: 'rare', label: 'Rare', color: '#b07cff', weight: 10, order: 2 },
  legendary: { id: 'legendary', label: 'Legendary', color: '#ffb52e', weight: 2, order: 3 },
};

// Habitats are decided by water depth where the bobber lands.
export const HABITATS = {
  shallows: { id: 'shallows', label: 'Shallows', hint: 'Near the beach, in shallow water', maxDepth: 1.1 },
  open: { id: 'open', label: 'Open Water', hint: 'A good cast away from shore', maxDepth: 2.3 },
  deep: { id: 'deep', label: 'Deep Water', hint: 'Far out, cast from the end of the dock', maxDepth: Infinity },
};

export const TIME_LABEL = { day: 'Daytime', night: 'Night only' };
export const WEATHER_LABEL = { rain: 'When raining' };

export function habitatForDepth(depth) {
  if (depth < HABITATS.shallows.maxDepth) return HABITATS.shallows;
  if (depth < HABITATS.open.maxDepth) return HABITATS.open;
  return HABITATS.deep;
}

// shape: body archetype used by the model builder.
// strength (0..1): how hard it fights. price: base sell value (Milestone 5).
// stripes: number of vertical bands in `stripe` colour.
export const FISH = [
  {
    id: 'minnow', name: 'Minnow', zones: ['sunny'], rarity: 'common', habitats: ['shallows'],
    size: [4, 10], strength: 0.1, price: 3, shape: 'standard',
    color: 0x9fb8c8, belly: 0xe8f1f5, fin: 0x6f8fa3,
    description: 'Tiny, quick and always hungry. Every angler\'s first friend.',
  },
  {
    id: 'sardine', name: 'Sardine', zones: ['sunny'], rarity: 'common', habitats: ['shallows', 'open'],
    size: [10, 22], strength: 0.2, price: 5, shape: 'standard',
    color: 0x5a86a8, belly: 0xdfe9ef, fin: 0x4f7c99,
    description: 'Travels in shimmering schools. Where there is one, there are hundreds.',
  },
  {
    id: 'mackerel', name: 'Mackerel', zones: ['sunny'], rarity: 'common', habitats: ['open'],
    size: [20, 40], strength: 0.3, price: 8, shape: 'standard',
    color: 0x3f7f8f, belly: 0xe6eef0, fin: 0x2f5f6b, stripes: 4, stripe: 0x24464f,
    description: 'Sleek and striped, with a fighting spirit bigger than its size.',
  },
  {
    id: 'snapper', name: 'Red Snapper', zones: ['sunny'], rarity: 'common', habitats: ['open'],
    size: [25, 55], strength: 0.35, price: 10, shape: 'standard',
    color: 0xe0564f, belly: 0xffc2b0, fin: 0xc23f3a,
    description: 'Rosy red and a little grumpy-looking. Tastes great grilled.',
  },
  {
    id: 'clownfish', name: 'Clownfish', zones: ['sunny'], time: 'day', rarity: 'uncommon', habitats: ['shallows'],
    size: [6, 12], strength: 0.25, price: 18, shape: 'standard',
    color: 0xff8a2b, belly: 0xffb066, fin: 0xff8a2b, stripes: 3, stripe: 0xffffff,
    description: 'Lives among anemones. Surprisingly brave for something so small.',
  },
  {
    id: 'flounder', name: 'Flounder', zones: ['sunny'], rarity: 'uncommon', habitats: ['shallows'],
    size: [20, 45], strength: 0.35, price: 16, shape: 'flat',
    color: 0xb59a73, belly: 0xe8dcc4, fin: 0x8f7652,
    description: 'Lies flat on the sand with both eyes on one side, watching you.',
  },
  {
    id: 'pufferfish', name: 'Pufferfish', zones: ['sunny'], rarity: 'uncommon', habitats: ['shallows', 'open'],
    size: [15, 30], strength: 0.45, price: 22, shape: 'round',
    color: 0xf2d066, belly: 0xfff4cc, fin: 0xc98f3a,
    description: 'Puffs up into a spiky ball when startled. Please do not squeeze.',
  },
  {
    id: 'seabass', name: 'Sea Bass', zones: ['sunny'], rarity: 'uncommon', habitats: ['open'],
    size: [30, 65], strength: 0.55, price: 24, shape: 'standard',
    color: 0x6c8c9e, belly: 0xdfe6ea, fin: 0x3f5868,
    description: 'A strong, steady fighter prized by anglers everywhere.',
  },
  {
    id: 'angelfish', name: 'Angelfish', zones: ['sunny'], rarity: 'uncommon', habitats: ['open'],
    size: [12, 30], strength: 0.35, price: 26, shape: 'tall',
    color: 0x5fc9f2, belly: 0xfff27a, fin: 0x2f8fd9, stripes: 2, stripe: 0x1f4f8f,
    description: 'Graceful and elegant, gliding through the water like a kite.',
  },
  {
    id: 'tuna', name: 'Bluefin Tuna', zones: ['sunny'], rarity: 'uncommon', habitats: ['deep'],
    size: [60, 150], strength: 0.7, price: 40, shape: 'standard',
    color: 0x2b4a7a, belly: 0xd6dde8, fin: 0xf2c94c,
    description: 'Built for speed. Hooking one feels like hooking a torpedo.',
  },
  {
    id: 'parrotfish', name: 'Parrotfish', zones: ['sunny'], rarity: 'rare', habitats: ['shallows', 'open'],
    size: [25, 60], strength: 0.5, price: 60, shape: 'standard',
    color: 0x3fd1a6, belly: 0x9ef2d6, fin: 0xff7ab8, stripes: 2, stripe: 0x2fa6e0,
    description: 'Crunches coral with its beak and turns it into soft white sand.',
  },
  {
    id: 'mahimahi', name: 'Mahi-mahi', zones: ['sunny'], rarity: 'rare', habitats: ['open', 'deep'],
    size: [60, 120], strength: 0.75, price: 75, shape: 'tall',
    color: 0x4fd18a, belly: 0xffe066, fin: 0x2fa6e0,
    description: 'Dazzling green and gold. Its colours shift as it leaps.',
  },
  {
    id: 'moray', name: 'Moray Eel', zones: ['sunny'], time: 'night', rarity: 'rare', habitats: ['deep'],
    size: [80, 180], strength: 0.65, price: 70, shape: 'long',
    color: 0x6b8f3a, belly: 0xc9d97a, fin: 0x55752c,
    description: 'Hides in rocky crevices by day and hunts at night. Not actually smiling.',
  },
  {
    id: 'manta', name: 'Manta Ray', zones: ['sunny'], weather: 'rain', rarity: 'rare', habitats: ['deep'],
    size: [100, 300], strength: 0.8, price: 90, shape: 'ray',
    color: 0x35455e, belly: 0xf0f2f5, fin: 0x35455e,
    description: 'A gentle giant that soars up from the deep when rain patters on the sea.',
  },
  {
    id: 'swordfish', name: 'Swordfish', zones: ['sunny'], rarity: 'rare', habitats: ['deep'],
    size: [120, 300], strength: 0.9, price: 110, shape: 'sword',
    color: 0x4a5f8f, belly: 0xd6dde8, fin: 0x34466e,
    description: 'Duels the open ocean with its long bill. A true trophy.',
  },
  {
    id: 'anglerfish', name: 'Anglerfish', zones: ['sunny'], rarity: 'legendary', time: 'night', habitats: ['deep'],
    size: [20, 60], strength: 0.85, price: 250, shape: 'angler',
    color: 0x3d2f4f, belly: 0x5e4a73, fin: 0x2a1f38,
    description: 'Dangles a glowing lure in the darkest water. Only rises at night.',
  },
  // ---------- Pine Lake ----------
  {
    id: 'perch', name: 'Perch', zones: ['pine'], rarity: 'common', habitats: ['shallows', 'open'], time: 'day',
    size: [12, 30], strength: 0.25, price: 6, shape: 'standard',
    color: 0x8fae4a, belly: 0xf2e6a0, fin: 0xff7a3d, stripes: 4, stripe: 0x4f6b2a,
    description: 'Striped and bold. Perch patrol the weedy shallows in little gangs.',
  },
  {
    id: 'bluegill', name: 'Bluegill', zones: ['pine'], rarity: 'common', habitats: ['shallows'],
    size: [10, 22], strength: 0.2, price: 5, shape: 'tall',
    color: 0x4f7fa8, belly: 0xffb34d, fin: 0x35587a,
    description: 'A round little sunfish with an orange belly. Always nibbling.',
  },
  {
    id: 'trout', name: 'Rainbow Trout', zones: ['pine'], rarity: 'uncommon', habitats: ['open'],
    size: [25, 60], strength: 0.45, price: 22, shape: 'standard',
    color: 0x7a9e8f, belly: 0xf5f0e6, fin: 0x6b8a7a, stripes: 1, stripe: 0xff8fb1,
    description: 'Shimmers with a pink stripe. Loves cool, clear water.',
  },
  {
    id: 'catfish', name: 'Catfish', zones: ['pine'], rarity: 'uncommon', habitats: ['open', 'deep'], time: 'night',
    size: [40, 100], strength: 0.6, price: 30, shape: 'catfish',
    color: 0x5a5a4a, belly: 0xc9c2a0, fin: 0x45453a,
    description: 'Feels its way through the dark with long whiskers. Comes out at night.',
  },
  {
    id: 'pike', name: 'Northern Pike', zones: ['pine'], rarity: 'rare', habitats: ['open', 'deep'],
    size: [50, 120], strength: 0.75, price: 70, shape: 'slim',
    color: 0x4f7a4a, belly: 0xe6e8c0, fin: 0x8f6b3a, stripes: 3, stripe: 0x9fc27a,
    description: 'A long, toothy ambush hunter. It strikes like lightning.',
  },
  {
    id: 'sturgeon', name: 'Sturgeon', zones: ['pine'], rarity: 'rare', habitats: ['deep'], weather: 'rain',
    size: [90, 220], strength: 0.85, price: 100, shape: 'slim',
    color: 0x6b7a85, belly: 0xd6dde0, fin: 0x55616b,
    description: 'An ancient, armoured giant. Rain stirs it up from the lake bed.',
  },
  {
    id: 'koi', name: 'Golden Koi', zones: ['pine'], rarity: 'legendary', habitats: ['shallows', 'open', 'deep'],
    size: [50, 90], strength: 0.9, price: 300, shape: 'standard',
    color: 0xffb52e, belly: 0xfff0b3, fin: 0xff6a3d,
    description: 'Said to bring good fortune to whoever catches it. Glides through Pine Lake, rarely.',
  },
  {
    id: 'ghostcarp', name: 'Ghost Carp', zones: ['pine'], rarity: 'legendary', habitats: ['deep'], time: 'night',
    size: [60, 110], strength: 0.95, price: 350, shape: 'standard', glow: true,
    color: 0xe8f4ff, belly: 0xffffff, fin: 0xbfe0ff,
    description: 'A pale, glowing carp seen only on dark nights. Some say it isn\'t really there.',
  },
];

export const FISH_BY_ID = Object.fromEntries(FISH.map((f) => [f.id, f]));

// Shape affects how heavy a fish is for its length.
const DENSITY = { standard: 1, round: 1.6, tall: 0.8, flat: 0.6, long: 0.2, ray: 0.9, sword: 0.9, angler: 1.8, slim: 0.45, catfish: 0.9 };

export function weightGrams(species, sizeCm) {
  return Math.round(0.013 * DENSITY[species.shape] * sizeCm ** 3);
}

export function formatWeight(grams) {
  return grams >= 1000 ? `${(grams / 1000).toFixed(1)} kg` : `${grams} g`;
}

// Can this species bite right now? conditions: { zone, night, raining }.
export function isAvailable(f, { zone, night, raining }) {
  if (!f.zones.includes(zone)) return false;
  if (f.time === 'night' && !night) return false;
  if (f.time === 'day' && night) return false;
  if (f.weather === 'rain' && !raining) return false;
  return true;
}

// Picks a species for the given habitat, weighted by rarity.
// rareBoost multiplies rare + legendary odds (deep water, rod luck, bait);
// legendaryBoost multiplies legendary odds on top (glow bait).
// conditions: { zone, night, raining } limits the pool to fish that are out right now.
export function rollFish(habitat, { rareBoost = 0, legendaryBoost = 0, conditions } = {}, rng = Math.random) {
  let pool = FISH.filter((f) => f.habitats.includes(habitat.id) && (!conditions || isAvailable(f, conditions)));
  // Fallback so a cast always catches something.
  if (!pool.length) pool = FISH.filter((f) => !conditions || f.zones.includes(conditions.zone));
  const weightOf = (f) => {
    let w = RARITY[f.rarity].weight;
    if (f.rarity === 'rare' || f.rarity === 'legendary') w *= 1 + rareBoost;
    if (f.rarity === 'legendary') w *= 1 + legendaryBoost;
    return w;
  };
  const total = pool.reduce((sum, f) => sum + weightOf(f), 0);
  let roll = rng() * total;
  let species = pool[0];
  for (const f of pool) {
    roll -= weightOf(f);
    if (roll <= 0) {
      species = f;
      break;
    }
  }
  const [min, max] = species.size;
  // Bias sizes toward the lower end so big ones feel special.
  const size = Math.round(min + (max - min) * Math.pow(rng(), 1.6));
  return { species, size, weight: weightGrams(species, size), rarity: RARITY[species.rarity], habitat };
}
