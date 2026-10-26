// Assembles the starter island: terrain, water, dock, hut and scattered props.
// Also answers gameplay questions about the world (where can I stand? what's in my way?).

import * as THREE from 'three';
import { WORLD } from '../config.js';
import { createRng } from '../core/math.js';
import { createTerrain } from './terrain.js';
import { createWater } from './water.js';
import { shorePoint, inlandDistance, groundHeight, addFlattenZone, isGrass } from './island.js';
import { Colliders } from './Colliders.js';
import { createDock, DOCK } from './props/dock.js';
import { createHut } from './props/hut.js';
import { createRoundTree, createPalm } from './props/trees.js';
import { createRock } from './props/rocks.js';
import { createFlower, createTuft } from './props/decor.js';
import { createSignpost } from './props/signpost.js';
import { Npc } from '../npc/Npc.js';

// Hand-tuned anchor points, in island polar coordinates (angle, distance inland).
export const ZONE = { name: 'Sunny Isle', subtitle: 'A quiet little island' };

const LAYOUT = {
  dockAngle: Math.PI / 2 + 0.35, // south side, facing the default camera
  dockInland: 2.8,
  hutAngleOffset: -0.34,
  hutInland: 9,
  spawnInland: 6.5,
};

export class World {
  constructor(scene) {
    this.scene = scene;
    this.root = new THREE.Group();
    this.root.name = 'world';
    scene.add(this.root);

    this.rng = createRng(WORLD.seed + 1);
    this.colliders = new Colliders();
    this.blockers = []; // {x, z, r} areas props shouldn't spawn in
    // Things the player can walk up to and press F on: { x, z, y, radius, verb, dialog }.
    this.interactables = [];
    this.npcs = [];
    this.zone = ZONE;

    // Order matters: flatten zones must exist before the terrain mesh is built.
    this.placeHut();
    this.root.add(createTerrain());
    this.water = createWater();
    this.root.add(this.water.group);
    this.placeDock();
    this.placeSignpost();
    this.placeSpawn();
    this.scatterProps();
  }

  placeDock() {
    const theta = LAYOUT.dockAngle;
    const base = shorePoint(theta, LAYOUT.dockInland);
    const dock = createDock(this.rng);
    dock.position.set(base.x, 0, base.z);
    dock.rotation.y = -theta; // local +X points out to sea
    this.root.add(dock);

    this.dock = {
      x: base.x,
      z: base.z,
      dirX: Math.cos(theta),
      dirZ: Math.sin(theta),
    };

    // Collide with the posts that sit on land or along the edges.
    for (const px of [1.5, DOCK.length / 2, DOCK.length - 0.3]) {
      for (const side of [-1, 1]) {
        const p = this.dockToWorld(px, side * (DOCK.width / 2 + 0.05));
        this.colliders.addCircle(p.x, p.z, 0.2);
      }
    }
    this.blockers.push({ ...this.dockToWorld(0, 0), r: 3.5 });
  }

  placeHut() {
    const theta = LAYOUT.dockAngle + LAYOUT.hutAngleOffset;
    const p = shorePoint(theta, LAYOUT.hutInland);
    const hut = createHut();
    const facing = Math.atan2(Math.cos(theta), Math.sin(theta)); // front (+Z) faces the sea
    const h = addFlattenZone(p.x, p.z, 5.5);
    hut.object.position.set(p.x, h - 0.05, p.z);
    hut.object.rotation.y = facing;
    this.root.add(hut.object);

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
    this.npcs.push(marina);

    const front = 3.6;
    this.interactables.push({
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
    this.colliders.addBox(p.x + ox, p.z + oz, hut.halfW, hut.halfD, facing);
    this.blockers.push({ x: p.x, z: p.z, r: 5 });
  }

  placeSignpost() {
    const p = this.dockToWorld(-1.4, 2.7);
    const sign = createSignpost(ZONE.name);
    const y = groundHeight(p.x, p.z);
    sign.position.set(p.x, y, p.z);
    // Face the board out to sea, which is toward the default camera.
    sign.rotation.y = Math.atan2(this.dock.dirX, this.dock.dirZ);
    this.root.add(sign);
    this.colliders.addCircle(p.x, p.z, 0.3);
    this.blockers.push({ x: p.x, z: p.z, r: 1.5 });
    this.interactables.push({
      x: p.x,
      z: p.z,
      y: y + 2.4,
      radius: 1.8,
      verb: 'Read',
      dialog: {
        name: 'Signpost',
        pages: [
          `Welcome to ${ZONE.name}! 🌴`,
          'Hold Space or click to charge a cast, then let go. The marker shows where your bobber will land.',
          'Deeper water hides rarer fish. Try casting from the end of the dock!',
          'When the bobber dips and a "!" pops up, press Space to hook. Hold to reel, but ease off when the line gets tight.',
          'Open your Journal (J) to see which fish are still out there. Happy fishing!',
        ],
      },
    });
  }

  nearestInteractable(x, z) {
    let best = null;
    let bestD = Infinity;
    for (const it of this.interactables) {
      const d = Math.hypot(x - it.x, z - it.z);
      if (d < it.radius && d < bestD) {
        best = it;
        bestD = d;
      }
    }
    return best;
  }

  placeSpawn() {
    const s = shorePoint(LAYOUT.dockAngle, LAYOUT.spawnInland);
    this.spawn = new THREE.Vector3(s.x, groundHeight(s.x, s.z), s.z);
    this.blockers.push({ x: s.x, z: s.z, r: 3 });
    // Keep a clear path from spawn to the dock.
    const mid = shorePoint(LAYOUT.dockAngle, (LAYOUT.spawnInland + LAYOUT.dockInland) / 2);
    this.blockers.push({ x: mid.x, z: mid.z, r: 2.5 });
  }

  isBlocked(x, z, pad = 0) {
    return this.blockers.some((b) => Math.hypot(x - b.x, z - b.z) < b.r + pad);
  }

  // Try to find a random free spot in a band of "inland distance".
  findSpot(minInland, maxInland, spacing, tries = 40) {
    for (let i = 0; i < tries; i++) {
      const p = shorePoint(this.rng() * Math.PI * 2, this.rng.range(minInland, maxInland));
      if (Math.hypot(p.x, p.z) > WORLD.islandRadius + 6) continue;
      if (this.isBlocked(p.x, p.z, spacing)) continue;
      return p;
    }
    return null;
  }

  addProp(prop, p, collide = true) {
    prop.object.position.set(p.x, groundHeight(p.x, p.z), p.z);
    this.root.add(prop.object);
    if (collide) this.colliders.addCircle(p.x, p.z, prop.radius);
    this.blockers.push({ x: p.x, z: p.z, r: prop.radius + 0.6 });
  }

  scatterProps() {
    const rng = this.rng;

    for (let i = 0; i < 26; i++) {
      const p = this.findSpot(7, 26, 1.6);
      if (p) this.addProp(createRoundTree(rng, rng.range(0.85, 1.25)), p);
    }
    for (let i = 0; i < 9; i++) {
      const p = this.findSpot(3.8, 5.5, 2.5);
      if (p) this.addProp(createPalm(rng, rng.range(0.9, 1.2)), p);
    }
    // Rocks on the beach, on the grass, and poking out of the shallows.
    for (let i = 0; i < 6; i++) {
      const p = this.findSpot(0.8, 3, 1);
      if (p) this.addProp(createRock(rng, rng.range(0.7, 1.3)), p);
    }
    for (let i = 0; i < 5; i++) {
      const p = this.findSpot(8, 20, 1);
      if (p) this.addProp(createRock(rng, rng.range(0.5, 0.9), true), p);
    }
    for (let i = 0; i < 7; i++) {
      const p = this.findSpot(-4, -1, 1.5);
      if (p) this.addProp(createRock(rng, rng.range(1.2, 2.2)), p, false);
    }

    // Decorative detail, no collision and allowed close to other things.
    for (let i = 0; i < 220; i++) {
      const p = shorePoint(rng() * Math.PI * 2, rng.range(5, 28));
      if (!isGrass(inlandDistance(p.x, p.z)) || Math.hypot(p.x, p.z) > WORLD.islandRadius + 4) continue;
      if (this.colliders.circles.some((c) => Math.hypot(p.x - c.x, p.z - c.z) < c.r + 0.2)) continue;
      const deco = rng() < 0.35 ? createFlower(rng) : createTuft(rng);
      deco.position.set(p.x, groundHeight(p.x, p.z), p.z);
      deco.rotation.y = rng() * Math.PI * 2;
      this.root.add(deco);
    }
  }

  dockToWorld(along, across) {
    const { x, z, dirX, dirZ } = this.dock;
    // "across" is perpendicular to the dock direction (local +Z).
    return { x: x + dirX * along - dirZ * across, z: z + dirZ * along + dirX * across };
  }

  isOnDock(x, z) {
    const { x: bx, z: bz, dirX, dirZ } = this.dock;
    const dx = x - bx;
    const dz = z - bz;
    const along = dx * dirX + dz * dirZ;
    const across = -dx * dirZ + dz * dirX;
    return along >= -0.2 && along <= DOCK.length && Math.abs(across) <= DOCK.width / 2 - 0.15;
  }

  // Height of the walkable surface at (x, z), or null if the spot isn't walkable.
  getWalkHeight(x, z) {
    if (this.isOnDock(x, z)) return DOCK.deckHeight;
    const h = groundHeight(x, z);
    return h > WORLD.waterLevel + 0.06 ? h : null;
  }

  update(time, dt, playerPos) {
    this.water.update(time);
    for (const npc of this.npcs) npc.update(dt, playerPos);
  }
}
