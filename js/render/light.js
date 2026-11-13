/**
 * The firelight model.
 *
 * Every pixel carries a "reach": how far the light must travel to touch it.
 * Each frame the fire's radius and brightness are folded into one small lookup
 * table mapping (reach, dither) to a light level, so the whole pool, the rim
 * light on trunks and the glow on figures respond to the fire with a single
 * table lookup per pixel.
 */

import { FIRE_X, FIRE_Y, GROUND_SQUASH, MAX_LEVEL, REACH_NEVER } from './constants.js';

/** Bits of ordered-dither value mixed into the lookup index. */
export const DITHER_BITS = 4;
export const LIGHT_LUT_SIZE = 256 << DITHER_BITS;

const DITHER_STEPS = 1 << DITHER_BITS;
/** Shape of the falloff: higher keeps the pool bright for longer before the edge. */
const FALLOFF_POWER = 1.7;

/** Ground distance from the fire to a screen position, in pixels. */
export const groundReach = (x, y) => Math.hypot(x - FIRE_X, (y - FIRE_Y) * GROUND_SQUASH);

/**
 * Fills the light lookup table for the current fire.
 * @param {Uint8Array} lut  LIGHT_LUT_SIZE entries, indexed (reach << DITHER_BITS) | bayer
 * @param {number} radius   reach at which the light dies out
 * @param {number} peak     0..1 brightness at the fire itself
 */
export function fillLightLut(lut, radius, peak) {
  for (let reach = 0; reach < 256; reach++) {
    let brightness = 0;
    if (reach < radius && reach < REACH_NEVER) {
      brightness = peak * (1 - (reach / radius) ** FALLOFF_POWER);
    }
    const scaled = brightness * MAX_LEVEL;
    const whole = Math.floor(scaled);
    const fraction = (scaled - whole) * DITHER_STEPS;
    const row = reach << DITHER_BITS;
    for (let d = 0; d < DITHER_STEPS; d++) {
      lut[row | d] = Math.min(MAX_LEVEL, whole + (fraction > d ? 1 : 0));
    }
  }
}
