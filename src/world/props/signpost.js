// Wooden signpost with the island's name painted on the board.

import * as THREE from 'three';
import { PALETTE } from '../../config.js';
import { flatMat, part } from './materials.js';

function paintBoard(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const g = canvas.getContext('2d');
  g.fillStyle = '#c98a52';
  g.fillRect(0, 0, 256, 128);
  // Plank lines.
  g.fillStyle = 'rgba(0,0,0,0.12)';
  for (const y of [42, 86]) g.fillRect(0, y, 256, 4);
  g.fillStyle = '#fff6e0';
  g.font = 'bold 44px Fredoka, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 128, 66);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createSignpost(text) {
  const g = new THREE.Group();
  g.add(part(new THREE.CylinderGeometry(0.08, 0.1, 1.8, 6), flatMat(PALETTE.woodDark), 0, 0.9, 0));

  const board = new THREE.BoxGeometry(1.5, 0.75, 0.1);
  const wood = flatMat(PALETTE.wood);
  const face = new THREE.MeshStandardMaterial({ map: paintBoard(text), roughness: 0.9 });
  // BoxGeometry material order: +x, -x, +y, -y, +z (front), -z (back).
  const mesh = new THREE.Mesh(board, [wood, wood, wood, wood, face, wood]);
  mesh.position.set(0, 1.45, 0.06);
  mesh.castShadow = true;
  g.add(mesh);

  // Little roof cap.
  g.add(part(new THREE.BoxGeometry(1.7, 0.08, 0.3), flatMat(PALETTE.roof), 0, 1.86, 0.06));
  return g;
}
