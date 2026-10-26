// Per-bus loudness trim so the default mix sits well: music under effects, ambience in between.
const BUS_TRIM = { music: 4, sfx: 2.5, ambient: 1.4 };

// Owns the Web Audio context and the mixer: master -> { music, sfx, ambient } buses.
// Everything is synthesised at runtime, so there are no audio files to load.

export class AudioEngine {
  constructor(settings) {
    this.settings = settings;
    this.ctx = null;
    settings.on('change', () => this.applyVolumes());
  }

  get ready() {
    return this.ctx !== null && this.ctx.state === 'running';
  }

  get now() {
    return this.ctx.currentTime;
  }

  // Browsers only allow audio after a user gesture; call this from one.
  unlock() {
    if (!this.ctx) {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.ctx = ctx;

      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -10;
      limiter.ratio.value = 6;
      limiter.connect(ctx.destination);

      this.master = ctx.createGain();
      this.master.connect(limiter);
      this.buses = {};
      for (const name of ['music', 'sfx', 'ambient']) {
        this.buses[name] = ctx.createGain();
        this.buses[name].connect(this.master);
      }
      this.noiseBuffer = makeNoise(ctx, 2, 'white');
      this.brownBuffer = makeNoise(ctx, 6, 'brown');
      this.applyVolumes();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  applyVolumes() {
    if (!this.ctx) return;
    const s = this.settings;
    const set = (node, v) => node.gain.setTargetAtTime(v, this.now, 0.05);
    set(this.master, s.get('masterVolume'));
    // Squared slider response feels more natural for the individual buses.
    for (const bus of ['music', 'sfx', 'ambient']) set(this.buses[bus], s.get(`${bus}Volume`) ** 2 * BUS_TRIM[bus]);
  }

  // ---------- building blocks used by sfx / music / ambience ----------

  // A single oscillator note with an attack/decay envelope and optional pitch glide.
  tone(freq, { at = this.now, dur = 0.2, type = 'sine', gain = 0.2, attack = 0.005, freqEnd, bus = 'sfx', filter } = {}) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, at);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, at + dur);
    const env = this.envelope(at, dur, gain, attack);
    let node = osc;
    if (filter) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = filter;
      osc.connect(f);
      node = f;
    }
    node.connect(env);
    env.connect(this.buses[bus]);
    osc.start(at);
    osc.stop(at + dur + 0.05);
  }

  // A burst of filtered noise (splashes, whooshes, footsteps).
  noise({ at = this.now, dur = 0.2, gain = 0.2, attack = 0.005, type = 'lowpass', freq = 1000, freqEnd, q = 1, bus = 'sfx' } = {}) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(freq, at);
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, at + dur);
    const env = this.envelope(at, dur, gain, attack);
    src.connect(f).connect(env).connect(this.buses[bus]);
    src.start(at, Math.random() * 1.5);
    src.stop(at + dur + 0.05);
  }

  envelope(at, dur, peak, attack) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(peak, at + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    return g;
  }
}

function makeNoise(ctx, seconds, color) {
  const length = ctx.sampleRate * seconds;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    if (color === 'brown') {
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    } else {
      data[i] = white;
    }
  }
  return buffer;
}
