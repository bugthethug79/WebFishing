// Pine Lake: a calm freshwater lake in a forested valley, with a campsite.

import { createRoundTree } from '../props/trees.js';
import { createRock } from '../props/rocks.js';
import { createFlower, createTuft } from '../props/decor.js';
import { createPine, createMushroom, createLogSeat, createTent, createCampfire, createFireflies } from '../props/forest.js';

const LAYOUT = {
  jettyAngle: Math.PI / 2 + 0.25, // south shore, facing the default camera
  jettyInland: 2.2,
  campAngleOffset: 0.42,
  campInland: 6.5,
  spawnInland: 5,
};

export const PINE_LAKE = {
  id: 'pine',
  name: 'Pine Lake',
  subtitle: 'Still water under tall pines',
  description: 'A peaceful forest lake with freshwater fish. Fireflies come out at night.',
  seed: 4242,
  island: {
    inverted: true, // land around the outside, water in the middle
    radius: 18,
    wobble: [
      [2, 3, 1.1],
      [1.2, 5, 0.2],
      [0.6, 8, 2.4],
    ],
    beachWidth: 2,
    lipWidth: 0.8,
    shoreTop: 0.25,
    grassBase: 0.6,
    hillAmp: 0.8,
    depth: 3.2,
    slope: 8,
    rim: { start: 12, width: 10, height: 6 }, // the valley walls
    maxInland: 13.5,
  },
  terrain: { size: 200, segments: 170 },
  palette: {
    grass: 0x6cbf4a,
    grassLight: 0x84cc52,
    grassDark: 0x58a83f,
    rim: 0x3f8a45,
    shore: 0xc8b48c,
    shoreWet: 0xa8916a,
    seabedShallow: 0x5fae96,
    seabedDeep: 0x1f5a6e,
    water: 0x37b5b0,
  },
  ambience: { waves: 0.35 },
  ferryColor: 0x3f8fc9,

  build(world) {
    const { island, rng } = world;

    const jetty = world.addPlatform(LAYOUT.jettyAngle, LAYOUT.jettyInland, { length: 9, width: 2.4, deckHeight: 0.38 });
    world.dock = jetty;
    world.addSignpost(jetty, this.name, [
      `Welcome to ${this.name}! 🌲`,
      'Lake fish are a different crowd: perch, trout, catfish... and something golden, if the stories are true.',
      'Catfish love the dark. Come back at night, when the fireflies are out.',
      'The rowboat at the end of the jetty will take you back to Sunny Isle whenever you like.',
    ]);
    const lamp = jetty.toWorld(-0.6, -2.4);
    world.addLamp(lamp.x, lamp.z);
    world.addFerry(jetty, this.ferryColor);

    // Campsite: fire, logs to sit on, a tent.
    const ca = LAYOUT.jettyAngle + LAYOUT.campAngleOffset;
    const fireP = island.shorePoint(ca, LAYOUT.campInland);
    const fy = island.addFlattenZone(fireP.x, fireP.z, 6);
    const fire = createCampfire();
    fire.object.position.set(fireP.x, fy, fireP.z);
    world.root.add(fire.object);
    world.animated.push({ update: (time) => fire.update(time) });
    world.nightLights.push({ light: fire.light, intensity: 9 });
    world.colliders.addCircle(fireP.x, fireP.z, 0.7);
    world.blockers.push({ x: fireP.x, z: fireP.z, r: 4.5 });
    for (let i = 0; i < 3; i++) {
      const a = ca * 3 + (i / 3) * Math.PI * 2 + 0.4;
      const seat = createLogSeat();
      const sx = fireP.x + Math.cos(a) * 1.8;
      const sz = fireP.z + Math.sin(a) * 1.8;
      seat.position.set(sx, fy, sz);
      seat.rotation.y = -a + Math.PI / 2;
      world.addStatic(seat);
      world.colliders.addCircle(sx, sz, 0.45);
    }
    const tentP = island.shorePoint(ca + 0.22, LAYOUT.campInland + 3);
    const tent = createTent();
    const ty = island.addFlattenZone(tentP.x, tentP.z, 3.5);
    const tentFacing = Math.atan2(fireP.x - tentP.x, fireP.z - tentP.z);
    tent.object.position.set(tentP.x, ty, tentP.z);
    tent.object.rotation.y = tentFacing;
    world.addStatic(tent.object);
    world.colliders.addBox(tentP.x, tentP.z, tent.halfW, tent.halfD, tentFacing);
    world.blockers.push({ x: tentP.x, z: tentP.z, r: 2.5 });

    const s = island.shorePoint(LAYOUT.jettyAngle, LAYOUT.spawnInland);
    world.spawn = { x: s.x, z: s.z, facing: Math.atan2(jetty.dirX, jetty.dirZ) };
    world.blockers.push({ x: s.x, z: s.z, r: 3 });
    const mid = island.shorePoint(LAYOUT.jettyAngle, (LAYOUT.spawnInland + LAYOUT.jettyInland) / 2);
    world.blockers.push({ x: mid.x, z: mid.z, r: 2.5 });

    // Forest: denser and taller toward the valley walls.
    for (let i = 0; i < 150; i++) {
      const p = world.findSpot(4, 26, 1.2);
      if (!p) continue;
      const d = island.inlandDistance(p.x, p.z);
      world.addProp(createPine(rng, rng.range(0.8, 1.2) + Math.max(0, d - 10) * 0.04), p, d < island.maxInland + 1);
    }
    for (let i = 0; i < 8; i++) {
      const p = world.findSpot(5, 12, 2);
      if (p) world.addProp(createRoundTree(rng, rng.range(0.8, 1.1)), p);
    }
    for (let i = 0; i < 10; i++) {
      const p = world.findSpot(0.5, 10, 1);
      if (p) world.addProp(createRock(rng, rng.range(0.5, 1.1), true), p);
    }
    for (let i = 0; i < 6; i++) {
      const p = world.findSpot(-2.5, -0.5, 1.5);
      if (p) world.addProp(createRock(rng, rng.range(1, 1.8), true), p, false);
    }
    for (let i = 0; i < 260; i++) {
      const p = island.shorePoint(rng() * Math.PI * 2, rng.range(2.5, 14));
      if (!island.isGrass(island.inlandDistance(p.x, p.z))) continue;
      if (world.colliders.circles.some((c) => Math.hypot(p.x - c.x, p.z - c.z) < c.r + 0.2)) continue;
      const roll = rng();
      const deco = roll < 0.12 ? createMushroom(rng) : roll < 0.35 ? createFlower(rng) : createTuft(rng);
      deco.position.set(p.x, island.groundHeight(p.x, p.z), p.z);
      deco.rotation.y = rng() * Math.PI * 2;
      world.addStatic(deco);
    }

    const fireflies = createFireflies(island, rng);
    world.root.add(fireflies.object);
    world.animated.push(fireflies);
  },
};
