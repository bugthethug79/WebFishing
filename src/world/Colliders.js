// Very small 2D (XZ plane) collision world: circles and rotated boxes.
// Plenty for a top-down game; swap for a physics engine only if we ever need one.

export class Colliders {
  constructor() {
    this.circles = [];
    this.boxes = [];
  }

  addCircle(x, z, r) {
    this.circles.push({ x, z, r });
  }

  // Box centred at (x, z) with half extents, rotated by `rotation` around Y.
  addBox(x, z, halfW, halfD, rotation = 0) {
    this.boxes.push({ x, z, halfW, halfD, cos: Math.cos(rotation), sin: Math.sin(rotation) });
  }

  // Pushes `pos` ({x, z}) out of any overlapping collider. Mutates and returns pos.
  resolve(pos, radius) {
    for (const c of this.circles) {
      const dx = pos.x - c.x;
      const dz = pos.z - c.z;
      const min = c.r + radius;
      const d2 = dx * dx + dz * dz;
      if (d2 < min * min && d2 > 1e-8) {
        const d = Math.sqrt(d2);
        pos.x = c.x + (dx / d) * min;
        pos.z = c.z + (dz / d) * min;
      }
    }

    for (const b of this.boxes) {
      // Into box space. Matches three.js rotation.y convention.
      const dx = pos.x - b.x;
      const dz = pos.z - b.z;
      const lx = dx * b.cos - dz * b.sin;
      const lz = dx * b.sin + dz * b.cos;

      const cx = Math.max(-b.halfW, Math.min(b.halfW, lx));
      const cz = Math.max(-b.halfD, Math.min(b.halfD, lz));
      let ox = lx - cx;
      let oz = lz - cz;
      const d2 = ox * ox + oz * oz;
      if (d2 >= radius * radius) continue;

      let nx;
      let nz;
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2);
        nx = cx + (ox / d) * radius;
        nz = cz + (oz / d) * radius;
      } else {
        // Centre is inside the box: exit via the nearest face.
        const pushX = b.halfW - Math.abs(lx);
        const pushZ = b.halfD - Math.abs(lz);
        if (pushX < pushZ) {
          nx = Math.sign(lx || 1) * (b.halfW + radius);
          nz = lz;
        } else {
          nx = lx;
          nz = Math.sign(lz || 1) * (b.halfD + radius);
        }
      }
      // Back to world space.
      pos.x = b.x + nx * b.cos + nz * b.sin;
      pos.z = b.z - nx * b.sin + nz * b.cos;
    }
    return pos;
  }
}
