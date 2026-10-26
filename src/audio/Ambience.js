// Background soundscape: rolling waves (louder near the shore) and birdsong (inland).

export class Ambience {
  constructor(engine) {
    this.engine = engine;
    this.started = false;
    this.shore = 0.5; // 0 inland .. 1 at the water
    this.nextWave = 0;
    this.nextBird = 2;
  }

  start() {
    const a = this.engine;
    if (this.started || !a.ready) return;
    this.started = true;
    const ctx = a.ctx;

    // Continuous surf bed: looping brown noise through a lowpass.
    const src = ctx.createBufferSource();
    src.buffer = a.brownBuffer;
    src.loop = true;
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 500;
    this.swell = ctx.createGain(); // individual wave swells
    this.swell.gain.value = 0.3;
    this.level = ctx.createGain(); // overall level (shore proximity)
    this.level.gain.value = 0.3;
    src.connect(this.filter).connect(this.swell).connect(this.level).connect(a.buses.ambient);
    src.start();
    this.nextWave = a.now + 0.5;
    this.nextBird = a.now + 2;
  }

  // shore: 0 when far inland, 1 standing at the water's edge or on the dock.
  update(shore) {
    const a = this.engine;
    if (!this.started) return;
    const now = a.now;
    this.shore = shore;
    this.level.gain.setTargetAtTime(0.25 + shore * 0.55, now, 0.5);

    // Schedule the next wave rolling in and out.
    if (now >= this.nextWave) {
      const rise = 1.6 + Math.random() * 1.2;
      const fall = 2.2 + Math.random() * 1.8;
      const peak = 0.6 + Math.random() * 0.4;
      const g = this.swell.gain;
      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now);
      g.linearRampToValueAtTime(peak, now + rise);
      g.linearRampToValueAtTime(0.25, now + rise + fall);
      const f = this.filter.frequency;
      f.cancelScheduledValues(now);
      f.setValueAtTime(f.value, now);
      f.linearRampToValueAtTime(700 + peak * 500, now + rise);
      f.linearRampToValueAtTime(400, now + rise + fall);
      this.nextWave = now + rise + fall * 0.8;
    }

    // Birds chirp more often away from the surf.
    if (now >= this.nextBird) {
      this.chirp(0.03 * (1.2 - shore * 0.7));
      this.nextBird = now + 2.5 + Math.random() * 6 * (0.6 + shore);
    }
  }

  chirp(gain) {
    const a = this.engine;
    const base = 2600 + Math.random() * 1400;
    const notes = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < notes; i++) {
      const at = a.now + i * (0.09 + Math.random() * 0.05);
      const f = base * (0.9 + Math.random() * 0.25);
      a.tone(f, { at, dur: 0.07, freqEnd: f * (Math.random() > 0.5 ? 1.35 : 0.75), gain, bus: 'ambient' });
    }
  }
}
