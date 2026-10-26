// Central place for tunable values and the colour palette.
// Keeping these together makes it easy to restyle or rebalance later.

export const PALETTE = {
  sky: 0x7fe0e8,
  fog: 0x7fe0e8,

  grass: 0x8fd14f,
  grassLight: 0xa8e063,
  grassDark: 0x6fbf3f,
  sand: 0xf2d59b,
  sandWet: 0xd9b77a,
  seabedShallow: 0x6fd3c4,
  seabedDeep: 0x1f7fa6,

  water: 0x3ccfe0,
  foam: 0xffffff,

  trunk: 0x8a5a3b,
  leaves: [0x6cc24a, 0x82d14f, 0x5fb544, 0x9bd94e],
  palmLeaves: [0x3fbf5a, 0x52cc63],
  rock: [0xe0a86a, 0xd49a5c, 0xc98c52],
  rockGrey: [0xa9b3b8, 0x9aa5ab],
  wood: 0xb5733f,
  woodDark: 0x8c5530,
  roof: 0x9b6a45,
  flowers: [0xffffff, 0xffd84d, 0xff8fb1, 0xb58cff],
};

// Zone shapes, sizes and seeds live in world/zones/*.js.
export const WORLD = {
  waterLevel: 0,
};

export const PLAYER = {
  radius: 0.45,
  walkSpeed: 5,
  sprintSpeed: 8.5,
  acceleration: 14, // how quickly velocity reaches the target speed
  turnSpeed: 12,
};

export const CAMERA = {
  fov: 35,
  pitch: 52 * (Math.PI / 180), // angle above the horizon
  distance: 26,
  minDistance: 14,
  maxDistance: 38,
  followDamping: 6,
  rotateStep: Math.PI / 4, // Q / E rotate in 45 degree steps
};
