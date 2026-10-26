import * as THREE from 'three';
import { PALETTE } from '../../config.js';
import { flatMat, part, jitter } from './materials.js';

export function createRock(rng, scale = 1, grey = false) {
  const geo = jitter(new THREE.DodecahedronGeometry(0.6, 0), 0.25, rng);
  geo.scale(1, rng.range(0.6, 0.9), rng.range(0.8, 1.1));
  const rock = part(geo, flatMat(rng.pick(grey ? PALETTE.rockGrey : PALETTE.rock)));
  rock.position.y = 0.15 * scale;
  rock.rotation.y = rng() * Math.PI * 2;
  rock.scale.setScalar(scale);

  const g = new THREE.Group();
  g.add(rock);
  return { object: g, radius: 0.55 * scale };
}
