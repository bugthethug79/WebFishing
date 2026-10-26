// Everything alive in a zone that isn't the player or an NPC.

import { FishShadows } from './FishShadows.js';
import { Critters } from './Critters.js';
import { Birds } from './Birds.js';

export class Life {
  // config: { fishShadows, crabs, frogs, gulls, songbirds } counts from the zone definition.
  constructor(world, config = {}) {
    this.shadows = new FishShadows(world, config.fishShadows ?? 0);
    this.critters = [];
    if (config.crabs) this.critters.push(new Critters(world, 'crab', config.crabs));
    if (config.frogs) this.critters.push(new Critters(world, 'frog', config.frogs));
    this.birds = [];
    if (config.gulls) this.birds.push(new Birds(world, 'gull', config.gulls));
    if (config.songbirds) this.birds.push(new Birds(world, 'songbird', config.songbirds));
    this.onSplash = null; // (x, z) when a frog dives in
  }

  update(dt, time, playerPos, { night = 0, rain = 0 } = {}) {
    this.shadows.update(dt, time, night);
    for (const c of this.critters) c.update(dt, time, playerPos, this.onSplash);
    const away = Math.max(night, rain > 0.6 ? 1 : 0);
    for (const b of this.birds) b.update(dt, time, away);
  }
}
