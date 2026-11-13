/**
 * The campfire: charred logs, glowing embers and procedurally animated flames,
 * plus the mapping from fire intensity to the light it casts.
 */

import { FIRE_X, FIRE_Y } from './constants.js';
import { MAT } from './palette.js';
import { clamp01, hash2, lerp, valueNoise } from './util.js';

/** Below this intensity the fire is cold ash. */
export const FIRE_DEAD = 0.03;
/** Below this intensity there are only embers, no flames. */
const FLAME_MIN = 0.2;
const FLAME_MIN_HEIGHT = 4;
const FLAME_MAX_HEIGHT = 25;
const FLAME_MIN_HALF_WIDTH = 2;
const FLAME_MAX_HALF_WIDTH = 7.5;
/** Flames animate on stepped frames, like hand-drawn sprite animation. */
const FLAME_FPS = 14;
const FLAME_RISE = 6.5;
const HEAT_WHITE = 0.74;
const HEAT_YELLOW = 0.47;
const HEAT_ORANGE = 0.25;
const HEAT_MIN = 0.08;
const EMBER_FPS = 7;

const LIGHT_RADIUS_MAX = 135;
const LIGHT_RADIUS_POWER = 1;
const LIGHT_RADIUS_MIN = 5;

/** Log end points relative to the fire, drawn as a loose star. */
const LOGS = [
  [-8, 2, 2, -1],
  [8, 2, -2, -1],
  [-5, -2, 3, 1],
  [6, -2, -3, 1],
  [-1, 3, 1, -2],
];
/** Ember positions relative to the fire, in the heart of the logs. */
const EMBERS = [[-2, 0], [0, 0], [2, 0], [-1, 1], [1, 1], [-3, 1], [3, 1], [0, -1], [-1, -1], [2, -1], [0, 2]];

/**
 * @typedef {object} FireLight
 * @property {number} radius  reach at which the light dies out
 * @property {number} peak    0..1 brightness at the fire
 * @property {[number, number, number]} tint  colour multipliers: dull red embers to gold
 */

/**
 * Light cast by a fire of the given intensity.
 * @param {number} intensity 0..1
 * @returns {FireLight}
 */
export function fireLight(intensity) {
  if (intensity < FIRE_DEAD) return { radius: 0, peak: 0, tint: [1, 0.4, 0.3] };
  const warmth = clamp01((intensity - 0.08) / 0.42);
  return {
    radius: LIGHT_RADIUS_MIN + LIGHT_RADIUS_MAX * intensity ** LIGHT_RADIUS_POWER,
    peak: Math.min(1, 0.3 + intensity * 1.3),
    tint: [1, lerp(0.42, 1, warmth), lerp(0.3, 1, warmth)],
  };
}

/**
 * Draws logs, embers and flames.
 * @param {import('./surface.js').Surface} frame
 * @param {number} intensity 0..1
 * @param {number} t         seconds
 * @param {number} wind      0..1, bends the flames to the right
 */
export function drawFire(frame, intensity, t, wind) {
  const alive = intensity >= FIRE_DEAD;
  for (const [x0, y0, x1, y1] of LOGS) {
    frame.line(FIRE_X + x0, FIRE_Y + y0, FIRE_X + x1, FIRE_Y + y1, MAT.CHAR, 0);
    frame.set(FIRE_X + x0, FIRE_Y + y0 - 1, alive ? MAT.WOOD_D : MAT.ASH, 0);
  }

  const emberFrame = Math.floor(t * EMBER_FPS);
  EMBERS.forEach(([dx, dy], i) => {
    if (!alive) {
      if (i % 2 === 0) frame.set(FIRE_X + dx, FIRE_Y + dy, MAT.ASH, 0);
      return;
    }
    const glow = hash2(i, emberFrame, 5) < 0.25 + intensity * 1.6;
    frame.set(FIRE_X + dx, FIRE_Y + dy, glow ? MAT.EMBER : MAT.EMBER_D, 0);
  });

  if (intensity < FLAME_MIN) return;
  const size = (intensity - FLAME_MIN) / (1 - FLAME_MIN);
  const height = lerp(FLAME_MIN_HEIGHT, FLAME_MAX_HEIGHT, size);
  const halfWidth = lerp(FLAME_MIN_HALF_WIDTH, FLAME_MAX_HALF_WIDTH, size);
  const time = Math.floor(t * FLAME_FPS) / FLAME_FPS;
  const reachX = Math.ceil(halfWidth) + 1;

  for (let k = 0; k < height + 4; k++) {
    const v = k / height;
    const bend = Math.round(wind * v * k * 0.35 + (valueNoise(k * 0.2, time * 3, 9) - 0.5) * v * 3);
    for (let dx = -reachX; dx <= reachX; dx++) {
      const u = dx / halfWidth;
      const body = 1.15 - u * u * (1 + v * 1.6) - v ** 1.3;
      // Noise scrolling upward tears the body into licking tongues.
      const tear = valueNoise(dx * 0.55 + 40, k * 0.33 - time * FLAME_RISE, 3);
      const heat = body - tear * 0.62 * (0.35 + v);
      if (heat < HEAT_MIN) continue;
      const mat =
        heat > HEAT_WHITE ? MAT.FLAME_W : heat > HEAT_YELLOW ? MAT.FLAME_Y : heat > HEAT_ORANGE ? MAT.FLAME_O : MAT.FLAME_R;
      frame.set(FIRE_X + dx + bend, FIRE_Y - 1 - k, mat, 0);
    }
  }
}
