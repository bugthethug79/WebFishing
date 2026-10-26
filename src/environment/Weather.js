// Weather state machine: clear / cloudy / rain, with smooth blending between them.

const STATES = {
  clear: { cloud: 0, rain: 0, icon: '', label: 'Clear' },
  cloudy: { cloud: 0.75, rain: 0, icon: '☁️', label: 'Cloudy' },
  rain: { cloud: 1, rain: 1, icon: '🌧️', label: 'Rain' },
};

const CHANCES = [
  ['clear', 0.55],
  ['cloudy', 0.25],
  ['rain', 0.2],
];

export class Weather {
  constructor() {
    this.state = 'clear';
    this.cloud = 0;
    this.rain = 0;
    this.hoursLeft = 3; // in-game hours until the weather may change
  }

  get info() {
    return STATES[this.state];
  }

  // Counts as raining for fish once the rain has properly started.
  get isRaining() {
    return this.rain > 0.5;
  }

  set(state) {
    this.state = state;
    this.hoursLeft = 2 + Math.random() * 3;
  }

  // dtHours: in-game hours elapsed this frame.
  update(dt, dtHours) {
    this.hoursLeft -= dtHours;
    if (this.hoursLeft <= 0) {
      let roll = Math.random();
      const next = CHANCES.find(([, p]) => (roll -= p) <= 0)?.[0] ?? 'clear';
      this.set(next);
    }
    const target = STATES[this.state];
    const k = Math.min(1, dt * 0.08); // roughly 12 seconds to blend
    this.cloud += (target.cloud - this.cloud) * k;
    this.rain += (target.rain - this.rain) * k;
  }
}
