// Synthesised sound effects. Call sfx.play('name', opts) from anywhere;
// it's a silent no-op until audio has been unlocked.

const midi = (n) => 440 * 2 ** ((n - 69) / 12);

const SOUNDS = {
  cast(a) {
    a.noise({ dur: 0.4, gain: 0.25, type: 'bandpass', freq: 2400, freqEnd: 500, q: 1.5, attack: 0.03 });
  },
  plop(a) {
    a.tone(700, { dur: 0.12, freqEnd: 160, gain: 0.3 });
    a.noise({ dur: 0.3, gain: 0.12, freq: 1400, freqEnd: 400 });
  },
  splash(a, { size = 1 } = {}) {
    for (let i = 0; i < 3; i++) {
      a.noise({
        at: a.now + i * 0.04 * Math.random(),
        dur: 0.2 + size * 0.25,
        gain: 0.12 * size,
        type: 'bandpass',
        freq: 900 + Math.random() * 1800,
        freqEnd: 300,
        q: 0.8,
      });
    }
  },
  nibble(a) {
    a.tone(950, { dur: 0.07, freqEnd: 650, gain: 0.12 });
  },
  bite(a) {
    a.tone(880, { dur: 0.12, type: 'triangle', gain: 0.22 });
    a.tone(1320, { at: a.now + 0.1, dur: 0.18, type: 'triangle', gain: 0.22 });
  },
  hook(a) {
    SOUNDS.splash(a, { size: 1 });
    a.tone(300, { dur: 0.15, freqEnd: 700, type: 'triangle', gain: 0.12 });
  },
  reelTick(a, { tension = 0 } = {}) {
    a.noise({ dur: 0.025, gain: 0.07, type: 'highpass', freq: 2500 + tension * 2500 });
    a.tone(1100 + tension * 900, { dur: 0.02, type: 'square', gain: 0.02 });
  },
  snap(a) {
    a.noise({ dur: 0.1, gain: 0.4, type: 'highpass', freq: 3000 });
    a.tone(1800, { dur: 0.18, freqEnd: 180, type: 'sawtooth', gain: 0.12, filter: 3000 });
  },
  escape(a) {
    a.tone(midi(72), { dur: 0.22, type: 'triangle', gain: 0.14 });
    a.tone(midi(67), { at: a.now + 0.18, dur: 0.35, type: 'triangle', gain: 0.14 });
  },
  catch(a, { legendary = false } = {}) {
    SOUNDS.splash(a, { size: 1.4 });
    const notes = legendary ? [72, 76, 79, 84, 88, 91] : [72, 76, 79, 84];
    notes.forEach((n, i) => a.tone(midi(n), { at: a.now + 0.15 + i * 0.09, dur: 0.4, type: 'triangle', gain: 0.16 }));
  },
  sparkle(a) {
    [88, 91, 96, 100].forEach((n, i) => a.tone(midi(n), { at: a.now + i * 0.06, dur: 0.3, gain: 0.07 }));
  },
  retrieve(a) {
    a.noise({ dur: 0.3, gain: 0.06, type: 'bandpass', freq: 1500, freqEnd: 2500, q: 4 });
  },
  step(a, { surface = 'grass' } = {}) {
    const v = 0.85 + Math.random() * 0.3;
    if (surface === 'wood') {
      a.tone(170 * v, { dur: 0.08, freqEnd: 110, gain: 0.14 });
      a.noise({ dur: 0.04, gain: 0.04, type: 'bandpass', freq: 900 * v });
    } else if (surface === 'sand') {
      a.noise({ dur: 0.07, gain: 0.05, type: 'bandpass', freq: 2200 * v, q: 0.7 });
    } else {
      a.noise({ dur: 0.08, gain: 0.06, freq: 600 * v });
    }
  },
  open(a) {
    a.tone(520, { dur: 0.1, freqEnd: 820, gain: 0.1 });
  },
  close(a) {
    a.tone(820, { dur: 0.1, freqEnd: 520, gain: 0.1 });
  },
  click(a) {
    a.tone(740, { dur: 0.05, type: 'triangle', gain: 0.08 });
  },
  toast(a) {
    a.tone(660, { dur: 0.07, gain: 0.08 });
    a.tone(990, { at: a.now + 0.06, dur: 0.1, gain: 0.08 });
  },
  talk(a) {
    a.tone(400 + Math.random() * 200, { dur: 0.04, type: 'triangle', gain: 0.05 });
  },
};

export class Sfx {
  constructor(engine) {
    this.engine = engine;
    this.last = {};
  }

  // minGap stops the same sound stacking up when triggered every frame.
  play(name, opts = {}, minGap = 0.03) {
    if (!this.engine.ready) return;
    const now = this.engine.now;
    if (now - (this.last[name] ?? -1) < minGap) return;
    this.last[name] = now;
    SOUNDS[name]?.(this.engine, opts);
  }
}
