// A loaded zone: terrain, water, props, NPCs and the gameplay queries about them
// (where can I stand? what's in my way? what can I interact with?).
// The zone definition (zones/*.js) decides what goes where; this class provides the toolkit.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { WORLD } from '../config.js';
import { createRng } from '../core/math.js';
import { Island } from './Island.js';
import { createTerrain } from './terrain.js';
import { createWater } from './water.js';
import { Colliders } from './Colliders.js';
import { createDock, DOCK } from './props/dock.js';
import { createLampPost, createRowboat } from './props/harbor.js';
import { createSignpost } from './props/signpost.js';
import { waveHeight } from './water.js';

export class World {
  constructor(scene, zone) {
    this.scene = scene;
    this.zone = zone;
    this.root = new THREE.Group();
    this.root.name = `zone:${zone.id}`;
    scene.add(this.root);
    // Non-moving props go here and are merged into a few meshes after building (see batchStatic).
    this.static = new THREE.Group();
    this.root.add(this.static);

    this.island = new Island(zone.island);
    this.rng = createRng(zone.seed + 1);
    this.colliders = new Colliders();
    this.blockers = []; // {x, z, r} areas props shouldn't spawn in
    // Things the player can press F on: { x, z, y, radius, verb, dialog | npc | travel }.
    this.interactables = [];
    this.npcs = [];
    this.platforms = []; // walkable docks / jetties
    this.nightLights = []; // { light, intensity } switched on after dark
    this.nightEmissive = []; // { material, color, intensity } glow after dark
    this.animated = []; // { update(time, night) }
    this.floaters = []; // { object, lift } bobbing on the water

    // Zone layout first: it registers flatten zones that the terrain needs.
    zone.build(this);
    this.batchStatic();
    this.root.add(createTerrain(this.island, zone));
    this.water = createWater(this.island, zone);
    this.root.add(this.water.group);
  }

  // ---------- placement helpers used by zone builders ----------

  isBlocked(x, z, pad = 0) {
    return this.blockers.some((b) => Math.hypot(x - b.x, z - b.z) < b.r + pad);
  }

  // A random free spot in a band of inland distance.
  findSpot(minInland, maxInland, spacing, tries = 40) {
    for (let i = 0; i < tries; i++) {
      const p = this.island.shorePoint(this.rng() * Math.PI * 2, this.rng.range(minInland, maxInland));
      if (!this.isBlocked(p.x, p.z, spacing)) return p;
    }
    return null;
  }

  // For decoration that never moves: it gets merged with everything else of the same material.
  addStatic(object) {
    this.static.add(object);
  }

  addProp(prop, p, collide = true) {
    prop.object.position.set(p.x, this.island.groundHeight(p.x, p.z), p.z);
    this.addStatic(prop.object);
    if (collide) this.colliders.addCircle(p.x, p.z, prop.radius);
    this.blockers.push({ x: p.x, z: p.z, r: prop.radius + 0.6 });
  }

  // Dock/jetty starting `inland` units on land at angle `theta`, pointing out over the water.
  addPlatform(theta, inland, size = DOCK) {
    const island = this.island;
    const base = island.shorePoint(theta, inland);
    const ahead = island.shorePoint(theta, inland - 1);
    const len = Math.hypot(ahead.x - base.x, ahead.z - base.z);
    const dirX = (ahead.x - base.x) / len;
    const dirZ = (ahead.z - base.z) / len;

    const mesh = createDock(this.rng, size);
    mesh.position.set(base.x, 0, base.z);
    mesh.rotation.y = Math.atan2(-dirZ, dirX); // local +X along the platform
    this.addStatic(mesh);

    const platform = { x: base.x, z: base.z, dirX, dirZ, ...size };
    platform.toWorld = (along, across) => ({
      x: base.x + dirX * along - dirZ * across,
      z: base.z + dirZ * along + dirX * across,
    });
    platform.contains = (x, z) => {
      const dx = x - base.x;
      const dz = z - base.z;
      const along = dx * dirX + dz * dirZ;
      const across = -dx * dirZ + dz * dirX;
      return along >= -0.2 && along <= size.length && Math.abs(across) <= size.width / 2 - 0.15;
    };
    this.platforms.push(platform);

    // Posts along the edges.
    for (const px of [1.5, size.length / 2, size.length - 0.3]) {
      for (const side of [-1, 1]) {
        const p = platform.toWorld(px, side * (size.width / 2 + 0.05));
        this.colliders.addCircle(p.x, p.z, 0.2);
      }
    }
    this.blockers.push({ ...platform.toWorld(0, 0), r: 3.5 });
    return platform;
  }

  addLamp(x, z) {
    const lamp = createLampPost();
    lamp.object.position.set(x, this.getWalkHeight(x, z) ?? this.island.groundHeight(x, z), z);
    this.root.add(lamp.object);
    this.colliders.addCircle(x, z, 0.2);
    this.blockers.push({ x, z, r: 1 });
    this.nightLights.push({ light: lamp.light, intensity: 10 });
    this.nightEmissive.push({ material: lamp.bulbMaterial, intensity: 2 });
  }

  addSignpost(platform, text, pages) {
    const p = platform.toWorld(-1.4, 2.7);
    const sign = createSignpost(text);
    const y = this.island.groundHeight(p.x, p.z);
    sign.position.set(p.x, y, p.z);
    sign.rotation.y = Math.atan2(platform.dirX, platform.dirZ); // face along the platform
    this.root.add(sign);
    this.colliders.addCircle(p.x, p.z, 0.3);
    this.blockers.push({ x: p.x, z: p.z, r: 1.5 });
    this.interactables.push({ x: p.x, z: p.z, y: y + 2.4, radius: 1.8, verb: 'Read', dialog: { name: 'Signpost', pages } });
  }

  // Rowboat moored beside the end of a platform; talking to it opens the travel menu.
  addFerry(platform, color) {
    const along = platform.length - 1.6;
    const p = platform.toWorld(along, platform.width / 2 + 0.9);
    const boat = createRowboat(color);
    boat.position.set(p.x, 0, p.z);
    boat.rotation.y = Math.atan2(-platform.dirZ, platform.dirX);
    this.root.add(boat);
    this.floaters.push({ object: boat, lift: 0.46 }); // keep the hull interior above the (see-through) water
    const stand = platform.toWorld(along, platform.width / 2 - 0.6);
    this.interactables.push({ x: stand.x, z: stand.z, y: platform.deckHeight + 2.3, radius: 1.6, verb: 'Sail', travel: true });
  }

  // Merges every static mesh that shares a material (and shadow setting) into one mesh.
  // Hundreds of little props become a handful of draw calls; they look exactly the same.
  batchStatic() {
    this.static.updateMatrixWorld(true);
    const batches = new Map();
    this.static.traverse((o) => {
      if (!o.isMesh) return;
      let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      // Only keep what flat-shaded materials need, so every geometry has matching attributes.
      for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
      g.applyMatrix4(o.matrixWorld);
      const key = `${o.material.uuid}|${o.castShadow}`;
      if (!batches.has(key)) batches.set(key, { material: o.material, cast: o.castShadow, geometries: [] });
      batches.get(key).geometries.push(g);
    });
    this.static.traverse((o) => o.geometry?.dispose());
    this.root.remove(this.static);
    for (const { material, cast, geometries } of batches.values()) {
      const merged = mergeGeometries(geometries);
      geometries.forEach((g) => g.dispose());
      const mesh = new THREE.Mesh(merged, material);
      mesh.castShadow = cast;
      mesh.receiveShadow = true;
      this.root.add(mesh);
    }
  }

  // ---------- gameplay queries ----------

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

  platformAt(x, z) {
    return this.platforms.find((p) => p.contains(x, z)) ?? null;
  }

  isOnDock(x, z) {
    return this.platformAt(x, z) !== null;
  }

  // Height of the walkable surface at (x, z), or null if the spot isn't walkable.
  getWalkHeight(x, z) {
    const platform = this.platformAt(x, z);
    if (platform) return platform.deckHeight;
    if (this.island.inlandDistance(x, z) > this.island.maxInland) return null;
    const h = this.island.groundHeight(x, z);
    return h > WORLD.waterLevel + 0.06 ? h : null;
  }

  // ---------- per frame ----------

  // night: 0 (day) .. 1 (full night)
  update(time, dt, playerPos, night = 0) {
    this.water.update(time);
    for (const npc of this.npcs) npc.update(dt, playerPos);
    for (const a of this.animated) a.update(time, night);
    for (const l of this.nightLights) l.light.intensity = l.intensity * night * (l.light.userData.flicker ?? 1);
    for (const e of this.nightEmissive) {
      e.material.emissive?.setHex(e.color ?? e.material.emissive.getHex());
      e.material.emissiveIntensity = e.intensity * night;
    }
    for (const { object: f, lift } of this.floaters) {
      f.position.y = waveHeight(f.position.x, f.position.z, time) + lift;
      f.rotation.x = Math.sin(time * 1.3 + f.position.x) * 0.05;
    }
  }

  dispose() {
    this.scene.remove(this.root);
    this.root.traverse((o) => {
      o.geometry?.dispose();
      // Shared cached materials are reused across zones, so only free textures.
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) m?.map?.dispose();
    });
  }
}
