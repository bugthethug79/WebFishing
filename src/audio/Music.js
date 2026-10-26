// Gentle procedural background music: plucked arpeggios over soft bass,
// with a sprinkled pentatonic melody. A look-ahead scheduler keeps timing tight.

const midi = (n) => 440 * 2 ** ((n - 69) / 12);

const BPM = 82;
const EIGHTH = 60 / BPM / 2;
// Fmaj7 -> Em7 -> Dm7 -> Cmaj7: a slow, sunny descent.
const CHORDS = [
  [53, 57, 60, 64],
  [52, 55, 59, 62],
  [50, 53, 57, 60],
  [48, 52, 55, 59],
];
const ARP = [0, 2, 1, 3, 2, 1, 3, 2];
const PENTATONIC = [72, 74, 76, 79, 81, 84];

export class Music {
  constructor(engine) {
    this.engine = engine;
    this.playing = false;
    this.step = 0;
    this.nextTime = 0;
  }

  start() {
    if (this.playing || !this.engine.ready) return;
    this.playing = true;
    this.step = 0;
    this.nextTime = this.engine.now + 0.3;
    this.timer = setInterval(() => this.schedule(), 25);
  }

  stop() {
    this.playing = false;
    clearInterval(this.timer);
  }

  schedule() {
    const a = this.engine;
    while (this.nextTime < a.now + 0.12) {
      this.playStep(this.step, this.nextTime);
      this.nextTime += EIGHTH;
      this.step++;
    }
  }

  playStep(step, at) {
    const bar = Math.floor(step / 8);
    const beat = step % 8;
    const chord = CHORDS[bar % CHORDS.length];
    const section = Math.floor(bar / 4) % 4; // vary density every few loops

    // Arpeggio, an octave up.
    if (section !== 3 || beat % 2 === 0) this.pluck(midi(chord[ARP[beat]] + 12), at, 0.07, 0.9);

    // Bass on beats 1 and 3.
    if (beat === 0 || beat === 4) this.bass(midi(chord[0] - 12), at);

    // Sparse melody, a bit busier in the middle sections.
    const chance = [0.15, 0.3, 0.35, 0.1][section];
    if (beat % 2 === 0 && Math.random() < chance) {
      const note = PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)];
      this.bell(midi(note), at);
    }
  }

  pluck(freq, at, gain, dur) {
    const a = this.engine;
    a.tone(freq, { at, dur, type: 'triangle', gain, attack: 0.004, bus: 'music', filter: 2200 });
    a.tone(freq * 2, { at, dur: dur * 0.4, gain: gain * 0.25, attack: 0.002, bus: 'music' });
  }

  bass(freq, at) {
    this.engine.tone(freq, { at, dur: 1.2, gain: 0.12, attack: 0.02, bus: 'music' });
  }

  bell(freq, at) {
    const a = this.engine;
    a.tone(freq, { at, dur: 1.4, gain: 0.05, attack: 0.005, bus: 'music' });
    a.tone(freq * 3, { at, dur: 0.4, gain: 0.012, attack: 0.002, bus: 'music' });
  }
}
