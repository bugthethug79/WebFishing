// Ring shown where the cast will land while charging: white over water, red over land.

import * as THREE from 'three';

export function createAimMarker() {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.38, 0.52, 28).rotateX(-Math.PI / 2), mat);
  const dot = new THREE.Mesh(new THREE.CircleGeometry(0.1, 12).rotateX(-Math.PI / 2), mat);
  group.add(ring, dot);
  // Draw after the (transparent) water so it isn't tinted away.
  ring.renderOrder = dot.renderOrder = 4;
  group.visible = false;

  const ok = new THREE.Color(0xffffff);
  const bad = new THREE.Color(0xff5a4f);

  return {
    object: group,
    show(x, y, z, valid, time) {
      group.visible = true;
      group.position.set(x, y, z);
      mat.color.copy(valid ? ok : bad);
      ring.scale.setScalar(1 + Math.sin(time * 8) * 0.08);
    },
    hide() {
      group.visible = false;
    },
  };
}
