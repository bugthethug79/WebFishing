// Describes one zone's landmass as pure functions of (x, z). Terrain generation,
// walkability and prop placement all read from here, so visuals and gameplay agree.
//
// The shape is a wobbly circle. Normally land is inside it (an island); with
// `inverted` the land is outside and the water inside (a lake in a valley).

import { smoothstep, lerp } from '../core/math.js';

const DEFAULTS = {
  radius: 24,
  wobble: [], // [amplitude, frequency, phase] sine terms added to the radius
  inverted: false,
  beachWidth: 3.5, // shore above water, measured inland from the waterline
  lipWidth: 1, // step up from shore to grass
  shoreTop: 0.3,
  grassBase: 0.75,
  hillAmp: 1,
  depth: 3, // deepest water
  slope: 9, // how far from shore the bottom reaches full depth
  rim: null, // { start, width, height }: hills rising far inland (valley walls)
  maxInland: Infinity, // walkable limit
};

export class Island {
  constructor(opts = {}) {
    Object.assign(this, DEFAULTS, opts);
    this.flattenZones = [];
  }

  // Shoreline radius at a given angle.
  shoreRadius(theta) {
    let r = this.radius;
    for (const [amp, freq, phase] of this.wobble) r += amp * Math.sin(freq * theta + phase);
    return r;
  }

  // Signed distance-ish value: positive on land, 0 at the waterline, negative in water.
  inlandDistance(x, z) {
    const d = this.shoreRadius(Math.atan2(z, x)) - Math.hypot(x, z);
    return this.inverted ? -d : d;
  }

  hills(x, z) {
    return (0.35 * Math.sin(x * 0.15) * Math.cos(z * 0.13) + 0.2 * Math.sin(x * 0.31 + z * 0.22) + 0.25) * this.hillAmp;
  }

  heightFromInland(d, x, z) {
    if (d < 0) return lerp(0, -this.depth, smoothstep(0, -this.slope, d));
    const { beachWidth: bw, lipWidth: lw } = this;
    if (d < bw) return lerp(0, this.shoreTop, d / bw);
    if (d < bw + lw) return lerp(this.shoreTop, this.grassBase, smoothstep(bw, bw + lw, d));
    let h = this.grassBase + this.hills(x, z) * smoothstep(bw + lw, 10, d);
    if (this.rim) h += this.rimFactor(d) * (this.rim.height + this.hills(x * 1.7, z * 1.7) * 2);
    return h;
  }

  rimFactor(d) {
    return this.rim ? smoothstep(this.rim.start, this.rim.start + this.rim.width, d) : 0;
  }

  // Flat pads (e.g. under buildings). Must be added before the terrain mesh is built.
  addFlattenZone(x, z, radius, height = this.heightFromInland(this.inlandDistance(x, z), x, z)) {
    this.flattenZones.push({ x, z, radius, height });
    return height;
  }

  heightFromInlandFlattened(d, x, z) {
    let h = this.heightFromInland(d, x, z);
    for (const f of this.flattenZones) {
      const dist = Math.hypot(x - f.x, z - f.z);
      if (dist < f.radius) h = lerp(f.height, h, smoothstep(f.radius * 0.6, f.radius, dist));
    }
    return h;
  }

  // Final ground height used by gameplay and the terrain mesh.
  groundHeight(x, z) {
    return this.heightFromInlandFlattened(this.inlandDistance(x, z), x, z);
  }

  isGrass(d) {
    return d >= this.beachWidth + this.lipWidth * 0.5;
  }

  // Polar position measured from the shoreline: `inland` > 0 is on land, < 0 in the water.
  shorePoint(theta, inland) {
    const r = this.shoreRadius(theta) + (this.inverted ? inland : -inland);
    return { x: Math.cos(theta) * r, z: Math.sin(theta) * r };
  }
}
