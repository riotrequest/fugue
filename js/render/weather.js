/**
 * Weather drawn over the finished scene: rain streaks with splashes, settling
 * snow, slow grey ash-fall, drifting fog banks and low dawn mist. Precipitation
 * only replaces a pixel's material, so flakes and fog passing through the
 * firelight glow warm.
 */

import { W, H, HORIZON_Y, WORLD_SEED } from './constants.js';
import { MAT, IS_FLAME } from './palette.js';
import { KIND } from './particles.js';
import { BAYER4, fbm, mulberry32 } from './util.js';

/** @typedef {{ rain: number, snow: number, ash: number, fog: number }} WeatherAmounts each 0..1 */

const RAIN_MAX = 170;
const RAIN_SPEED = 230;
const RAIN_SLANT = 0.12;
const RAIN_WIND_SLANT = 0.55;
const RAIN_LENGTH = 4;
const SPLASH_CHANCE = 0.6;
const SPLASH_LIFE = 0.22;

const SNOW_MAX = 240;
const SNOW_WIND = 36;
const ASH_MAX = 150;
const ASH_WIND = 16;

const FOG_TILE = 256;
const FOG_SCROLL = 5;
const FOG_MAX_COVER = 11;
/** Thinner fog than this is left out: very sparse dither reads as a dot grid, not haze. */
const FOG_MIN_COVER = 3.5;
/** Noise below the gap is clear air, so fog gathers into banks instead of a flat veil. */
const FOG_GAP = 0.4;
const FOG_CONTRAST = 5;
/** Mist pools along the tree line and, thinly, at the near edge of the clearing. */
const MIST_BANDS = [
  { y: 58, spread: 15, strength: 1 },
  { y: 152, spread: 20, strength: 0.4 },
];
const MIN_VISIBLE = 0.01;

export function createWeather() {
  const rng = mulberry32(WORLD_SEED + 900);

  const rain = Array.from({ length: RAIN_MAX }, () => ({
    x: rng() * (W + 60) - 60,
    y: rng() * H,
    land: HORIZON_Y + 10 + rng() * (H - HORIZON_Y - 10),
    speed: RAIN_SPEED * (0.8 + rng() * 0.4),
  }));
  const flake = (minFall, maxFall) => ({
    x: rng() * W,
    y: rng() * H,
    fall: minFall + rng() * (maxFall - minFall),
    phase: rng() * Math.PI * 2,
    big: rng() < 0.22,
    pale: rng() < 0.6,
  });
  const snow = Array.from({ length: SNOW_MAX }, () => flake(14, 30));
  const ash = Array.from({ length: ASH_MAX }, () => flake(5, 13));

  const fogNoise = new Uint8Array(FOG_TILE * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < FOG_TILE; x++) {
      // Blend two noise fields across the tile so it wraps without a seam.
      const k = x / FOG_TILE;
      const n = fbm(x * 0.022, y * 0.07, 60) * (1 - k) + fbm((x - FOG_TILE) * 0.022, y * 0.07, 60) * k;
      fogNoise[y * FOG_TILE + x] = Math.max(0, Math.min(255, (n - FOG_GAP) * FOG_CONTRAST * 255));
    }
  }
  const fogProfile = new Float32Array(H);
  const mistProfile = new Float32Array(H);
  for (let y = 0; y < H; y++) {
    fogProfile[y] = 0.62 + 0.38 * Math.sin(y * 0.085 + 1.2);
    for (const band of MIST_BANDS) {
      mistProfile[y] += band.strength * Math.exp(-(((y - band.y) / band.spread) ** 2));
    }
  }

  const count = (amount, max) => Math.round(Math.min(1, amount) * max);

  /**
   * @param {number} dt
   * @param {WeatherAmounts} amounts
   * @param {number} wind 0..1
   * @param {number} t    seconds
   * @param {ReturnType<import('./particles.js').createParticles>} particles
   */
  function update(dt, amounts, wind, t, particles) {
    const slant = RAIN_SLANT + wind * RAIN_WIND_SLANT;
    for (let i = count(amounts.rain, RAIN_MAX) - 1; i >= 0; i--) {
      const drop = rain[i];
      drop.y += drop.speed * dt;
      drop.x += drop.speed * slant * dt;
      if (drop.y < drop.land) continue;
      if (Math.random() < SPLASH_CHANCE) particles.spawn(KIND.SPLASH, drop.x, drop.land, 0, 0, SPLASH_LIFE);
      drop.y = -Math.random() * 30;
      drop.x = Math.random() * (W + 80) - 80;
      drop.land = HORIZON_Y + 10 + Math.random() * (H - HORIZON_Y - 10);
    }
    drift(snow, count(amounts.snow, SNOW_MAX), dt, wind * SNOW_WIND, 7, t);
    drift(ash, count(amounts.ash, ASH_MAX), dt, wind * ASH_WIND, 5, t);
  }

  function drift(flakes, active, dt, push, wander, t) {
    for (let i = 0; i < active; i++) {
      const f = flakes[i];
      f.y += f.fall * dt;
      f.x += (push + Math.sin(t * 1.1 + f.phase) * wander) * dt;
      if (f.y > H) f.y -= H + 2;
      if (f.x >= W) f.x -= W;
      else if (f.x < 0) f.x += W;
    }
  }

  function drawFog(frame, fog, mist, t) {
    const near = Math.floor(t * FOG_SCROLL);
    const far = Math.floor(t * FOG_SCROLL * 0.45);
    for (let y = 0; y < H; y++) {
      const strength = (fog * fogProfile[y] + mist * mistProfile[y]) * (FOG_MAX_COVER / 255);
      if (strength * 255 < 1) continue;
      const row = y * W;
      const noiseRow = y * FOG_TILE;
      const noiseRow2 = ((y + 67) % H) * FOG_TILE;
      const bayerRow = (y & 3) << 2;
      for (let x = 0; x < W; x++) {
        const n = (fogNoise[noiseRow + ((x + near) & 255)] + fogNoise[noiseRow2 + ((x - far) & 255)]) >> 1;
        const cover = n * strength;
        if (cover < FOG_MIN_COVER || BAYER4[bayerRow | (x & 3)] >= cover) continue;
        if (!IS_FLAME[frame.mat[row + x]]) frame.mat[row + x] = MAT.FOG;
      }
    }
  }

  /**
   * @param {import('./surface.js').Surface} frame
   * @param {WeatherAmounts} amounts
   * @param {number} mist 0..1 dawn mist
   * @param {number} wind 0..1
   * @param {number} t    seconds
   */
  function draw(frame, amounts, mist, wind, t) {
    if (amounts.fog > MIN_VISIBLE || mist > MIN_VISIBLE) drawFog(frame, amounts.fog, mist, t);

    const slant = RAIN_SLANT + wind * RAIN_WIND_SLANT;
    for (let i = count(amounts.rain, RAIN_MAX) - 1; i >= 0; i--) {
      const drop = rain[i];
      for (let k = 0; k < RAIN_LENGTH; k++) {
        frame.paint(Math.round(drop.x - k * slant), Math.round(drop.y) - k, MAT.RAIN);
      }
    }
    for (let i = count(amounts.snow, SNOW_MAX) - 1; i >= 0; i--) {
      const f = snow[i];
      const x = Math.round(f.x);
      const y = Math.round(f.y);
      frame.paint(x, y, MAT.SNOWFLAKE);
      if (f.big) frame.paint(x + 1, y, MAT.SNOWFLAKE);
    }
    for (let i = count(amounts.ash, ASH_MAX) - 1; i >= 0; i--) {
      const f = ash[i];
      const x = Math.round(f.x);
      const y = Math.round(f.y);
      const mat = f.pale ? MAT.ASHFLAKE : MAT.ASHFLAKE_D;
      frame.paint(x, y, mat);
      if (f.big) frame.paint(x + 1, y + (Math.sin(t * 2 + f.phase) > 0 ? 1 : 0), mat);
    }
  }

  return { update, draw };
}
