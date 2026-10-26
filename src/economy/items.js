// Everything Marina sells. Stats are multipliers relative to the starter gear.

// cast: max cast distance. reel: progress speed. tension: how fast tension builds (lower = easier).
// luck: extra chance for rare/legendary fish.
export const RODS = [
  {
    id: 'bamboo', name: 'Bamboo Rod', price: 0, color: 0x6b4128, tip: 0xff5a4f,
    cast: 12, reel: 1, tension: 1, luck: 0,
    description: 'Simple and trusty. Every angler starts somewhere.',
  },
  {
    id: 'sturdy', name: 'Sturdy Rod', price: 250, color: 0x3f6fb5, tip: 0xffffff,
    cast: 13.5, reel: 1.15, tension: 0.85, luck: 0.1,
    description: 'A thicker line and a stronger reel. Fish tire out faster.',
  },
  {
    id: 'pro', name: 'Fiberglass Pro', price: 800, color: 0x2fb58f, tip: 0xffd84d,
    cast: 15, reel: 1.3, tension: 0.72, luck: 0.25,
    description: 'Light, springy and long. Reaches the really deep water.',
  },
  {
    id: 'golden', name: 'Golden Rod', price: 2500, color: 0xf2c230, tip: 0xff6a3d,
    cast: 17, reel: 1.5, tension: 0.6, luck: 0.5,
    description: 'Legends say rare fish can\'t resist its shine.',
  },
];

// Bait is bought in packs and one is used per cast that lands in water.
// bite: multiplier on waiting time. rare / legendary: extra rarity boosts.
export const BAITS = [
  {
    id: 'worms', name: 'Worms', icon: '🪱', price: 15, pack: 10,
    bite: 0.55, rare: 0, legendary: 0,
    description: 'Wriggly and irresistible. Fish bite much sooner.',
  },
  {
    id: 'lure', name: 'Shiny Lure', icon: '✨', price: 45, pack: 5,
    bite: 0.85, rare: 0.8, legendary: 0.5,
    description: 'Flashes in the water. Rare fish come to investigate.',
  },
  {
    id: 'glow', name: 'Glow Bait', icon: '💡', price: 120, pack: 3,
    bite: 0.9, rare: 1, legendary: 3,
    description: 'Glows in the dark depths. Legendary fish can\'t resist.',
  },
];

export const NO_BAIT = { id: null, name: 'No bait', icon: '🎣', bite: 1, rare: 0, legendary: 0 };

export const HATS = [
  { id: 'bucket', name: 'Bucket Hat', price: 0, description: 'The classic. Sunny yellow.' },
  { id: 'straw', name: 'Straw Hat', price: 60, description: 'Wide brim, big summer energy.' },
  { id: 'beanie', name: 'Cozy Beanie', price: 90, description: 'Warm, soft and topped with a pom-pom.' },
  { id: 'captain', name: 'Captain\'s Cap', price: 180, description: 'For the commander of a very small dock.' },
  { id: 'fishhat', name: 'Fish Hat', price: 350, description: 'It\'s a fish. On your head. Perfect.' },
  { id: 'crown', name: 'Golden Crown', price: 1500, description: 'Royalty of the reef.' },
];

export const byId = (list, id) => list.find((it) => it.id === id) ?? null;
