/**
 * The clearing floor: grass, the darker forest floor around it, the bare dirt
 * of the fire pit, and the swaying grass tufts drawn on top each frame.
 */

import { W, H, FIRE_X, FIRE_Y, GROUND_SQUASH, HORIZON_Y, CLEARING, REACH_NEVER, WORLD_SEED } from '../constants.js';
import { MAT, IS_GROUND } from '../palette.js';
import { groundReach } from '../light.js';
import { clamp, fbm, hash2, mulberry32 } from '../util.js';

/** Clearing-ellipse value beyond which grass gives way to forest floor. */
const EDGE = 1;
const EDGE_RAGGEDNESS = 0.25;
const DEEP_FOREST = 1.45;
/** Extra reach per unit outside the clearing: the canopy shades the floor. */
const FOREST_SHADE = 70;
/** The pool's edge is broken into this many radial rays, like the reference. */
const RAY_COUNT = 56;
const RAY_DEPTH = 0.16;
const ASH_RADIUS = 5;
const DIRT_RADIUS = 14;
/** Snow never settles this close to the fire pit. */
const BARE_RADIUS = 17;
const MELT_RADIUS = 30;
const FAR_EDGE_ROWS = 7;
const PIT_STONES = 11;
const PIT_RX = 10;
const PIT_RY = 5;

const TUFT_COUNT = 210;
const TUFT_CLEAR_RADIUS = 20;
const TUFT_SWAY_RATE = 1.4;

/**
 * Paints the ground into the backdrop, with reach and snow thresholds.
 * @param {import('../surface.js').Surface} surface
 */
export function paintGround(surface) {
  const { cx, cy, rx, ry } = CLEARING;
  for (let y = HORIZON_Y; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const wobble = (fbm(x * 0.03, y * 0.05, 21) - 0.5) * 0.4;
      const e = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + wobble;
      const distance = groundReach(x, y);
      const grain = hash2(x, y, 5);

      let mat;
      if (e > DEEP_FOREST) mat = grain < 0.1 ? MAT.FLOOR : MAT.FLOOR_D;
      else if (e > EDGE + (grain - 0.5) * EDGE_RAGGEDNESS) mat = grain < 0.3 ? MAT.FLOOR_D : MAT.FLOOR;
      else {
        // Blades are two pixels tall: hash on half the row.
        const v = fbm(x * 0.07, y * 0.11, 7) * 0.75 + hash2(x, y >> 1, 9) * 0.5;
        mat = v < 0.47 ? MAT.GRASS_D : v < 0.9 ? MAT.GRASS : MAT.GRASS_L;
      }
      const scuffed = distance + (grain - 0.5) * 7;
      if (scuffed < ASH_RADIUS) mat = grain < 0.5 ? MAT.ASH : MAT.DIRT_D;
      else if (scuffed < DIRT_RADIUS) mat = grain < 0.3 ? MAT.DIRT_D : MAT.DIRT;

      const angle = Math.atan2((y - FIRE_Y) * GROUND_SQUASH, x - FIRE_X);
      const ray = (hash2(Math.floor((angle * RAY_COUNT) / Math.PI), 0, 31) - 0.5) * RAY_DEPTH * distance;
      const reach = distance + ray + Math.max(0, e - EDGE) * FOREST_SHADE;

      let cover = 0.1 + 0.8 * (0.62 * fbm(x * 0.05, y * 0.09, 40) + 0.38 * hash2(x, y, 41));
      if (e > EDGE) cover += 0.1;
      if (distance < MELT_RADIUS) cover += ((MELT_RADIUS - distance) / (MELT_RADIUS - BARE_RADIUS)) * 0.6;
      const snow = distance < BARE_RADIUS || cover > 1 ? 0 : clamp(Math.round(cover * 255), 1, 255);

      // The far edge of the floor dissolves raggedly into the lightless forest.
      if (y < HORIZON_Y + FAR_EDGE_ROWS && hash2(x >> 1, y, 77) > (y - HORIZON_Y + 1) / (FAR_EDGE_ROWS + 1)) {
        surface.set(x, y, MAT.DEPTH, REACH_NEVER);
        continue;
      }
      surface.set(x, y, mat, clamp(Math.round(reach), 0, REACH_NEVER - 1), snow);
    }
  }
  paintPitStones(surface);
}

function paintPitStones(surface) {
  for (let k = 0; k < PIT_STONES; k++) {
    const angle = (k / PIT_STONES) * Math.PI * 2 + 0.2;
    const x = FIRE_X + Math.round(Math.cos(angle) * PIT_RX);
    const y = FIRE_Y + Math.round(Math.sin(angle) * PIT_RY) + 1;
    const big = hash2(k, 0, 61) < 0.6;
    surface.set(x, y, MAT.STONE, 4);
    if (big) surface.set(x + 1, y, MAT.STONE, 4);
    surface.set(x, y + 1, MAT.STONE_D, 12);
    if (big) surface.set(x + 1, y + 1, MAT.STONE_D, 12);
  }
}

/**
 * @typedef {object} Tuft
 * @property {number} x
 * @property {number} y      row of the tuft's base
 * @property {boolean} tall
 * @property {number} phase  sway phase offset
 * @property {number} reach  absolute firelight reach
 * @property {number} buried cold (0..255) above which snow hides the tuft
 */

/** @returns {Tuft[]} sorted back to front */
export function createTufts() {
  const rng = mulberry32(WORLD_SEED + 9);
  const { cx, cy, rx, ry } = CLEARING;
  /** @type {Tuft[]} */
  const tufts = [];
  while (tufts.length < TUFT_COUNT) {
    const x = Math.floor(rng() * W);
    const y = HORIZON_Y + 6 + Math.floor(rng() * (H - HORIZON_Y - 8));
    const e = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
    const distance = groundReach(x, y);
    if (e > 1.08 || distance < TUFT_CLEAR_RADIUS) continue;
    tufts.push({
      x,
      y,
      tall: rng() < 0.45,
      phase: rng() * Math.PI * 2,
      reach: clamp(Math.round(distance * 0.9 - 4), 0, REACH_NEVER - 1),
      buried: 90 + Math.floor(rng() * 150),
    });
  }
  return tufts.sort((a, b) => a.y - b.y);
}

/**
 * Draws the grass tufts, leaning with the wind. Tufts only grow on open
 * ground, so anything built or sitting on top of one hides it.
 * @param {import('../surface.js').Surface} frame
 * @param {Tuft[]} tufts
 * @param {number} t     seconds
 * @param {number} wind  0..1
 * @param {number} cold  0..255 snow cover
 */
export function drawTufts(frame, tufts, t, wind, cold) {
  const amplitude = 0.55 + wind * 1.1;
  for (const tuft of tufts) {
    if (cold > tuft.buried) continue;
    const { x, y, reach } = tuft;
    if (!IS_GROUND[frame.mat[y * W + x]]) continue;
    const lean = Math.round(clamp(Math.sin(t * TUFT_SWAY_RATE + tuft.phase + x * 0.04) * amplitude + wind * 0.6, -1, 1));
    frame.set(x - 1, y, MAT.GRASS_L, reach);
    frame.set(x + 1, y, MAT.GRASS_L, reach);
    frame.set(x, y, MAT.GRASS_L, reach);
    frame.set(x - 2 + lean, y - 1, MAT.GRASS_T, reach);
    frame.set(x, y - 1, MAT.GRASS_L, reach);
    frame.set(x + 2 + lean, y - 1, MAT.GRASS_T, reach);
    if (tuft.tall) frame.set(x + lean, y - 2, MAT.GRASS_T, reach);
  }
}
