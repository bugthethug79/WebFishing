// Pure functions that describe the island's shape. Terrain mesh generation,
// walkability checks and prop placement all read from here, so the visuals
// and the gameplay always agree.

import { WORLD } from '../config.js';
import { smoothstep, lerp } from '../core/math.js';

const BEACH_WIDTH = 3.5; // sand above water, measured inland from the shoreline
const LIP_WIDTH = 1.0; // little step up from sand to grass
const SAND_TOP = 0.3;
export const GRASS_BASE = 0.75;

// Shoreline radius at a given angle: a wobbly circle.
export function shoreRadius(theta) {
  return (
    WORLD.islandRadius +
    2.5 * Math.sin(3 * theta + 0.5) +
    1.5 * Math.sin(5 * theta + 1.3) +
    0.8 * Math.sin(9 * theta + 2.0)
  );
}

// Signed distance-ish value: positive inland, 0 on the shoreline, negative at sea.
export function inlandDistance(x, z) {
  return shoreRadius(Math.atan2(z, x)) - Math.hypot(x, z);
}

function hills(x, z) {
  return (
    0.35 * Math.sin(x * 0.15) * Math.cos(z * 0.13) +
    0.2 * Math.sin(x * 0.31 + z * 0.22) +
    0.25
  );
}

export function heightFromInland(d, x, z) {
  if (d < 0) {
    // Underwater slope down to the sea floor.
    return lerp(0, -3, smoothstep(0, -9, d));
  }
  if (d < BEACH_WIDTH) return lerp(0, SAND_TOP, d / BEACH_WIDTH);
  if (d < BEACH_WIDTH + LIP_WIDTH) {
    return lerp(SAND_TOP, GRASS_BASE, smoothstep(BEACH_WIDTH, BEACH_WIDTH + LIP_WIDTH, d));
  }
  return GRASS_BASE + hills(x, z) * smoothstep(BEACH_WIDTH + LIP_WIDTH, 10, d);
}

// Flat pads (e.g. under buildings). Registered by the world before the terrain is built.
const flattenZones = [];

export function addFlattenZone(x, z, radius, height = terrainHeight(x, z)) {
  flattenZones.push({ x, z, radius, height });
  return height;
}

export function terrainHeight(x, z) {
  return heightFromInland(inlandDistance(x, z), x, z);
}

// Applies flatten zones on top of the natural island height.
export function heightFromInlandFlattened(d, x, z) {
  let h = heightFromInland(d, x, z);
  for (const f of flattenZones) {
    const dist = Math.hypot(x - f.x, z - f.z);
    if (dist < f.radius) h = lerp(f.height, h, smoothstep(f.radius * 0.6, f.radius, dist));
  }
  return h;
}

// Final ground height used by gameplay and the terrain mesh.
export function groundHeight(x, z) {
  return heightFromInlandFlattened(inlandDistance(x, z), x, z);
}

export function isGrass(d) {
  return d >= BEACH_WIDTH + LIP_WIDTH * 0.5;
}

// Convert polar coordinates measured from the shoreline into a world position.
// `inland` = how far inland from the shore (negative = out at sea).
export function shorePoint(theta, inland) {
  const r = shoreRadius(theta) - inland;
  return { x: Math.cos(theta) * r, z: Math.sin(theta) * r };
}
