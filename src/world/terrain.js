// Builds the faceted low-poly terrain mesh for a zone.

import * as THREE from 'three';
import { createRng } from '../core/math.js';

export function createTerrain(island, zone) {
  const { size, segments: segs } = zone.terrain;
  const P = zone.palette;
  const geo = new THREE.PlaneGeometry(size, size, segs, segs);
  geo.rotateX(-Math.PI / 2);

  // Jitter grid points a little so the facets don't look like a perfect grid.
  const rng = createRng(zone.seed);
  const pos = geo.attributes.position;
  const step = size / segs;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let z = pos.getZ(i);
    const edge = Math.abs(x) >= size / 2 - 0.01 || Math.abs(z) >= size / 2 - 0.01;
    if (!edge) {
      x += (rng() - 0.5) * step * 0.6;
      z += (rng() - 0.5) * step * 0.6;
    }
    const d = island.inlandDistance(x, z);
    pos.setXYZ(i, x, island.heightFromInlandFlattened(d, x, z), z);
  }

  // Non-indexed so each triangle gets its own flat colour.
  const flat = geo.toNonIndexed();
  geo.dispose();
  const p = flat.attributes.position;
  const colors = new Float32Array(p.count * 3);

  const col = (hex) => new THREE.Color(hex);
  const grass = col(P.grass);
  const grassLight = col(P.grassLight);
  const grassDark = col(P.grassDark);
  const shore = col(P.shore);
  const shoreWet = col(P.shoreWet);
  const shallow = col(P.seabedShallow);
  const deep = col(P.seabedDeep);
  const rim = col(P.rim ?? P.grassDark);
  const c = new THREE.Color();

  for (let i = 0; i < p.count; i += 3) {
    const cx = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3;
    const cy = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3;
    const cz = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3;
    const d = island.inlandDistance(cx, cz);

    if (island.isGrass(d)) {
      const t = rng();
      c.copy(grass).lerp(t > 0.5 ? grassLight : grassDark, (t - 0.5) * 0.8);
      c.lerp(rim, island.rimFactor(d) * 0.7);
    } else if (cy > 0.06) {
      c.copy(shore).lerp(shoreWet, Math.max(0, 0.25 - cy) * 2);
    } else {
      // Under water: wet shore -> shallow -> deep.
      const depth = Math.min(1, -cy / island.depth);
      c.copy(shoreWet).lerp(shallow, Math.min(1, depth * 3)).lerp(deep, Math.max(0, depth - 0.25) / 0.75);
    }
    const shade = 1 + (rng() - 0.5) * 0.04;
    for (let k = 0; k < 3; k++) {
      colors[(i + k) * 3] = c.r * shade;
      colors[(i + k) * 3 + 1] = c.g * shade;
      colors[(i + k) * 3 + 2] = c.b * shade;
    }
  }

  flat.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  flat.computeVertexNormals();

  const mesh = new THREE.Mesh(
    flat,
    new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 }),
  );
  mesh.receiveShadow = true;
  mesh.name = 'terrain';

  const group = new THREE.Group();
  group.add(mesh);

  // Endless sea floor beyond the generated terrain (islands only; lakes are ringed by land).
  if (!island.inverted) {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(2000, 2000).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: P.seabedDeep, roughness: 1 }),
    );
    floor.position.y = -island.depth - 0.01;
    group.add(floor);
  }
  return group;
}
