// Turns time of day + weather into lighting: sun/moon, ambient, sky and fog colours.

import * as THREE from 'three';
import { smoothstep } from '../core/math.js';

// Keyframes through the day (hour -> look). Colours are sRGB hex.
const KEYS = [
  { h: 0, sky: 0x1b2a4a, hemiSky: 0x5a78b8, hemiGround: 0x2a2f4a, hemi: 1.0, sun: 0x9fb8ff, sunI: 0.7 },
  { h: 4.8, sky: 0x1b2a4a, hemiSky: 0x5a78b8, hemiGround: 0x2a2f4a, hemi: 1.0, sun: 0x9fb8ff, sunI: 0.7 },
  { h: 6.5, sky: 0xf5b08a, hemiSky: 0xffd6b8, hemiGround: 0xd8b49a, hemi: 1.45, sun: 0xffc09a, sunI: 1.7 },
  { h: 9, sky: 0x7fe0e8, hemiSky: 0xcff6ff, hemiGround: 0xf5d7a0, hemi: 1.6, sun: 0xfff1d6, sunI: 2.6 },
  { h: 16.5, sky: 0x7fe0e8, hemiSky: 0xcff6ff, hemiGround: 0xf5d7a0, hemi: 1.6, sun: 0xfff1d6, sunI: 2.6 },
  { h: 18.4, sky: 0xf0a090, hemiSky: 0xffd0b0, hemiGround: 0xe0b090, hemi: 1.65, sun: 0xffc890, sunI: 2.0 },
  { h: 20, sky: 0x5a4f96, hemiSky: 0x8a80d0, hemiGround: 0x3d3a5e, hemi: 1.05, sun: 0xb8b0ff, sunI: 0.8 },
  { h: 21.5, sky: 0x1b2a4a, hemiSky: 0x5a78b8, hemiGround: 0x2a2f4a, hemi: 1.0, sun: 0x9fb8ff, sunI: 0.7 },
  { h: 24, sky: 0x1b2a4a, hemiSky: 0x5a78b8, hemiGround: 0x2a2f4a, hemi: 1.0, sun: 0x9fb8ff, sunI: 0.7 },
];

const OVERCAST_DAY = new THREE.Color(0x9aaab5);
const OVERCAST_NIGHT = new THREE.Color(0x232a38);
const MOON_OFFSET = new THREE.Vector3(-16, 30, 12);

export class Sky {
  constructor(lighting, scene) {
    this.lighting = lighting;
    this.scene = scene;
    this.sky = new THREE.Color();
    this._a = new THREE.Color();
    this._b = new THREE.Color();
    this._sunOffset = new THREE.Vector3();
    this.brightness = 1; // 0..1, for things that aren't lit (foam)
  }

  sample(h, key) {
    let i = 0;
    while (KEYS[i + 1].h < h) i++;
    const a = KEYS[i];
    const b = KEYS[i + 1];
    const t = smoothstep(a.h, b.h, h);
    if (typeof a[key] === 'number' && key.endsWith('I')) return a[key] + (b[key] - a[key]) * t;
    if (key === 'hemi') return a.hemi + (b.hemi - a.hemi) * t;
    return this._a.set(a[key]).lerp(this._b.set(b[key]), t);
  }

  update(time, weather, night) {
    const { hemi, sun } = this.lighting;
    const h = time.hours;
    const cloud = weather.cloud;

    // Colours and intensities from the keyframes, dimmed by cloud cover.
    this.sky.copy(this.sample(h, 'sky')).lerp(night > 0.5 ? OVERCAST_NIGHT : OVERCAST_DAY, cloud * 0.6);
    hemi.color.copy(this.sample(h, 'hemiSky'));
    hemi.groundColor.copy(this.sample(h, 'hemiGround'));
    hemi.intensity = this.sample(h, 'hemi') * (1 - cloud * 0.2);
    sun.color.copy(this.sample(h, 'sun'));
    sun.intensity = this.sample(h, 'sunI') * (1 - cloud * 0.65);

    // The sun arcs east to west through the day; at night the "sun" light becomes the moon.
    const a = ((h - 6) / 12) * Math.PI;
    // Keep a minimum elevation so dawn/dusk light stays warm instead of grazing the ground.
    this._sunOffset.set(Math.cos(a) * 26, 12 + Math.max(0.45, Math.sin(a)) * 26, 14);
    const moon = Math.max(1 - smoothstep(4.5, 6, h), smoothstep(19, 20.5, h));
    this.lighting.sunOffset.copy(this._sunOffset).lerp(MOON_OFFSET, moon);

    this.scene.background.copy(this.sky);
    this.scene.fog.color.copy(this.sky);
    this.scene.fog.near = 55 - weather.rain * 25;
    this.scene.fog.far = 130 - weather.rain * 55;

    this.brightness = Math.min(1, Math.max(0.3, hemi.intensity / 1.6) * (1 - cloud * 0.15));
  }
}
