// One object the game talks to for all sound.

import { AudioEngine } from './AudioEngine.js';
import { Sfx } from './Sfx.js';
import { Ambience } from './Ambience.js';
import { Music } from './Music.js';

export class Audio {
  constructor(settings) {
    this.engine = new AudioEngine(settings);
    this.sfx = new Sfx(this.engine);
    this.ambience = new Ambience(this.engine);
    this.music = new Music(this.engine);
  }

  // Call from a user gesture (the title screen click).
  start() {
    this.engine.unlock();
    // resume() is async; start layers once the context is actually running.
    const begin = () => {
      this.ambience.start();
      this.music.start();
    };
    if (this.engine.ready) begin();
    else this.engine.ctx.addEventListener('statechange', begin, { once: true });
  }

  play(name, opts, minGap) {
    this.sfx.play(name, opts, minGap);
  }

  update(shore) {
    this.ambience.update(shore);
  }
}
