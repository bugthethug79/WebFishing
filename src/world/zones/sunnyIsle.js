// Sunny Isle: the starter tropical island with Marina's shop.

import { PALETTE } from '../../config.js';
import { createHut } from '../props/hut.js';
import { createRoundTree, createPalm } from '../props/trees.js';
import { createRock } from '../props/rocks.js';
import { createFlower, createTuft } from '../props/decor.js';
import { Npc } from '../../npc/Npc.js';

// Hand-tuned anchors in island polar coordinates (angle, distance inland).
const LAYOUT = {
  dockAngle: Math.PI / 2 + 0.35, // south side, facing the default camera
  dockInland: 2.8,
  hutAngleOffset: -0.34,
  hutInland: 9,
  spawnInland: 6.5,
};

export const SUNNY_ISLE = {
  id: 'sunny',
  name: 'Sunny Isle',
  subtitle: 'A quiet little island',
  description: 'Warm sand, palm trees and salty sea fish. Marina\'s shop is here.',
  seed: 1337,
  island: {
    radius: 24,
    wobble: [
      [2.5, 3, 0.5],
      [1.5, 5, 1.3],
      [0.8, 9, 2.0],
    ],
  },
  terrain: { size: 160, segments: 200 },
  palette: {
    grass: PALETTE.grass,
    grassLight: PALETTE.grassLight,
    grassDark: PALETTE.grassDark,
    shore: PALETTE.sand,
    shoreWet: PALETTE.sandWet,
    seabedShallow: PALETTE.seabedShallow,
    seabedDeep: PALETTE.seabedDeep,
    water: PALETTE.water,
  },
  ambience: { waves: 1, gulls: true },
  life: { fishShadows: 9, crabs: 5, gulls: 4 },
  ferryColor: 0xe0564f,

  build(world) {
    const { island } = world;
    placeHut(world);
    const dock = world.addPlatform(LAYOUT.dockAngle, LAYOUT.dockInland);
    world.dock = dock;
    world.addSignpost(dock, this.name, [
      `Welcome to ${this.name}! 🌴`,
      'Hold Space or click to charge a cast, then let go. The marker shows where your bobber will land.',
      'Deeper water hides rarer fish. Try casting from the end of the dock!',
      'When the bobber dips and a "!" pops up, press Space to hook. Hold to reel, but ease off when the line gets tight.',
      'Some fish only come out at night or in the rain. The rowboat at the end of the dock can take you to new places.',
    ]);
    const lamp = dock.toWorld(-0.6, -2.4);
    world.addLamp(lamp.x, lamp.z);
    world.addFerry(dock, this.ferryColor);

    const s = island.shorePoint(LAYOUT.dockAngle, LAYOUT.spawnInland);
    world.spawn = { x: s.x, z: s.z, facing: 0 };
    world.blockers.push({ x: s.x, z: s.z, r: 3 });
    const mid = island.shorePoint(LAYOUT.dockAngle, (LAYOUT.spawnInland + LAYOUT.dockInland) / 2);
    world.blockers.push({ x: mid.x, z: mid.z, r: 2.5 });

    scatter(world);
  },
};

function placeHut(world) {
  const { island } = world;
  const theta = LAYOUT.dockAngle + LAYOUT.hutAngleOffset;
  const p = island.shorePoint(theta, LAYOUT.hutInland);
  const hut = createHut();
  const facing = Math.atan2(Math.cos(theta), Math.sin(theta)); // front (+Z) faces the sea
  const h = island.addFlattenZone(p.x, p.z, 5.5);
  hut.object.position.set(p.x, h - 0.05, p.z);
  hut.object.rotation.y = facing;
  world.root.add(hut.object);
  world.nightEmissive.push({ material: hut.windowMaterial, color: 0xffd27a, intensity: 1.4 });

  // Marina the shopkeeper stands on the porch.
  const marina = new Npc({
    skin: 0xc98f6b,
    shirt: 0xfff4e0,
    stripe: 0xff8fb1,
    jacket: 0x3fbfa0,
    pants: 0x6b4f8f,
    shoes: 0x8a5a3b,
    hair: 0x5a3322,
    hat: 'straw',
  });
  marina.object.position.set(0.3, 0.3, 2.5); // front edge of the porch, clear of the roof
  hut.object.add(marina.object);
  world.npcs.push(marina);

  const front = 3.6;
  world.interactables.push({
    x: p.x + Math.sin(facing) * front,
    z: p.z + Math.cos(facing) * front,
    y: h + 2.9,
    radius: 2.8,
    verb: 'Talk',
    npc: 'marina', // the game opens Marina's dialogue + shop
  });

  // Box collider shifted to match the porch offset.
  const ox = Math.sin(facing) * hut.offsetZ;
  const oz = Math.cos(facing) * hut.offsetZ;
  world.colliders.addBox(p.x + ox, p.z + oz, hut.halfW, hut.halfD, facing);
  world.blockers.push({ x: p.x, z: p.z, r: 5 });
}

function scatter(world) {
  const { rng, island } = world;
  for (let i = 0; i < 26; i++) {
    const p = world.findSpot(7, 26, 1.6);
    if (p) world.addProp(createRoundTree(rng, rng.range(0.85, 1.25)), p);
  }
  for (let i = 0; i < 9; i++) {
    const p = world.findSpot(3.8, 5.5, 2.5);
    if (p) world.addProp(createPalm(rng, rng.range(0.9, 1.2)), p);
  }
  // Rocks on the beach, on the grass, and poking out of the shallows.
  for (let i = 0; i < 6; i++) {
    const p = world.findSpot(0.8, 3, 1);
    if (p) world.addProp(createRock(rng, rng.range(0.7, 1.3)), p);
  }
  for (let i = 0; i < 5; i++) {
    const p = world.findSpot(8, 20, 1);
    if (p) world.addProp(createRock(rng, rng.range(0.5, 0.9), true), p);
  }
  for (let i = 0; i < 7; i++) {
    const p = world.findSpot(-4, -1, 1.5);
    if (p) world.addProp(createRock(rng, rng.range(1.2, 2.2)), p, false);
  }

  // Decorative detail, no collision and allowed close to other things.
  for (let i = 0; i < 220; i++) {
    const p = island.shorePoint(rng() * Math.PI * 2, rng.range(5, 28));
    if (!island.isGrass(island.inlandDistance(p.x, p.z))) continue;
    if (world.colliders.circles.some((c) => Math.hypot(p.x - c.x, p.z - c.z) < c.r + 0.2)) continue;
    const deco = rng() < 0.35 ? createFlower(rng) : createTuft(rng);
    deco.position.set(p.x, island.groundHeight(p.x, p.z), p.z);
    deco.rotation.y = rng() * Math.PI * 2;
    world.addStatic(deco);
  }
}
