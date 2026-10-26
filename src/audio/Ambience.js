// Background soundscape: rolling waves (louder near the shore), birdsong by day,
// crickets at night, and rain.

// Seconds since the previous ambience update (for per-second chances).
const dt = (now, self) => Math.min(0.1, now - (self.lastUpdate ?? now));

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

    // Rain: bright hiss whose level follows the weather.
    const rainSrc = ctx.createBufferSource();
    rainSrc.buffer = a.noiseBuffer;
    rainSrc.loop = true;
    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = 'bandpass';
    rainFilter.frequency.value = 3000;
    rainFilter.Q.value = 0.4;
    this.rainLevel = ctx.createGain();
    this.rainLevel.gain.value = 0;
    rainSrc.connect(rainFilter).connect(this.rainLevel).connect(a.buses.ambient);
    rainSrc.start();
    this.nextCricket = a.now + 1;
    this.nextWave = a.now + 0.5;
    this.nextBird = a.now + 2;
  }

  // shore: 0 far inland .. 1 at the water's edge. env: { night, rain, waves } all 0..1.
  // gulls / frogs: whether this zone has them.
  update(shore, { night = 0, rain = 0, waves = 1, gulls = false, frogs = false } = {}) {
    const a = this.engine;
    if (!this.started) return;
    const now = a.now;
    this.shore = shore;
    this.level.gain.setTargetAtTime((0.25 + shore * 0.55) * waves, now, 0.5);
    this.rainLevel.gain.setTargetAtTime(rain * 0.3, now, 0.5);

    // Crickets after dark: little triple chirps.
    if (night > 0.3 && now >= this.nextCricket) {
      const f = 4200 + Math.random() * 600;
      for (let i = 0; i < 3; i++) a.tone(f, { at: now + i * 0.06, dur: 0.035, gain: 0.018 * night, bus: 'ambient' });
      this.nextCricket = now + 0.5 + Math.random() * 1.2;
    }

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

    // Gull cries by day over the sea, frog croaks at night by the lake.
    if (gulls && night < 0.5 && rain < 0.6 && Math.random() < dt(now, this) * 0.08) this.gull();
    if (frogs && night > 0.4 && Math.random() < dt(now, this) * 0.25) this.croak(night);
    this.lastUpdate = now;

    // Birds chirp more often away from the surf.
    if (now >= this.nextBird) {
      if (night < 0.5 && rain < 0.5) this.chirp(0.03 * (1.2 - shore * 0.7) * (1 - night));
      this.nextBird = now + 2.5 + Math.random() * 6 * (0.6 + shore);
    }
  }

  gull() {
    const a = this.engine;
    const calls = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < calls; i++) {
      const at = a.now + i * 0.22;
      a.tone(1900, { at, dur: 0.18, freqEnd: 1200, type: 'triangle', gain: 0.025, bus: 'ambient', filter: 3000 });
    }
  }

  croak(night) {
    const a = this.engine;
    for (let i = 0; i < 2; i++) {
      a.tone(150 + Math.random() * 40, { at: a.now + i * 0.13, dur: 0.1, freqEnd: 110, type: 'square', gain: 0.03 * night, bus: 'ambient', filter: 600 });
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
