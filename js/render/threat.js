/**
 * Things watching from the dark: pairs of pale eyes between the trunks. They
 * only ever show where the firelight does not reach, and as the threat rises
 * more of them open, closer to the clearing.
 */

import { W, H, CLEARING, HORIZON_Y, WORLD_SEED } from './constants.js';
import { MAT } from './palette.js';
import { DITHER_BITS, groundReach } from './light.js';
import { mulberry32 } from './util.js';

/**
 * @typedef {object} Watcher
 * @property {number} x       left eye
 * @property {number} y
 * @property {number} wakes   threat level at which it appears
 * @property {number} phase   blink / lurk phase offset
 * @property {number} period  seconds between blinks
 */

const WATCHER_COUNT = 18;
const EYE_GAP = 2;
const BLINK_SECONDS = 0.16;
/** Clearing-ellipse value the watchers keep outside of. */
const LURK_EDGE = 1.12;
const LURK_MAX_ROW = 150;
const LURK_MARGIN = 22;
/** Mid dither value: "is this spot lit at all" is sampled at half coverage. */
const DITHER_MID = 8;

const HIDING_PLACES = new Uint8Array(256);
for (const mat of [MAT.FLOOR, MAT.FLOOR_D, MAT.DEPTH, MAT.FAR2, MAT.BARK_FAR]) HIDING_PLACES[mat] = 1;

/**
 * Picks the spots eyes may appear at: dark forest floor outside the clearing.
 * @param {import('./surface.js').Surface} forest  backdrop with trunks, no structures
 * @returns {Watcher[]} farthest first
 */
export function createWatchers(forest) {
  const rng = mulberry32(WORLD_SEED + 666);
  const { cx, cy, rx, ry } = CLEARING;
  /** @type {Watcher[]} */
  const watchers = [];
  for (let attempt = 0; attempt < 4000 && watchers.length < WATCHER_COUNT; attempt++) {
    const x = LURK_MARGIN + Math.floor(rng() * (W - LURK_MARGIN * 2));
    const y = HORIZON_Y - 4 + Math.floor(rng() * (LURK_MAX_ROW - HORIZON_Y));
    const e = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
    if (e < LURK_EDGE) continue;
    if (!HIDING_PLACES[forest.get(x, y)] || !HIDING_PLACES[forest.get(x + EYE_GAP, y)]) continue;
    if (watchers.some((w) => Math.abs(w.x - x) < 9 && Math.abs(w.y - y) < 5)) continue;
    watchers.push({ x, y, wakes: 0, phase: rng() * 40, period: 2.4 + rng() * 3.5 });
  }
  watchers.sort((a, b) => groundReach(b.x, b.y) - groundReach(a.x, a.y));
  watchers.forEach((w, i) => {
    w.wakes = (i + 0.5) / watchers.length;
  });
  return watchers;
}

/**
 * @param {import('./surface.js').Surface} frame
 * @param {Watcher[]} watchers
 * @param {Uint8Array} lut   current light lookup table
 * @param {number} threat    0..1
 * @param {number} startle   0..1 'danger' pulse: every watcher opens its eyes
 * @param {number} t         seconds
 */
export function drawWatchers(frame, watchers, lut, threat, startle, t) {
  if (threat <= 0 && startle <= 0) return;
  for (const w of watchers) {
    const forced = startle > 0.15;
    if (!forced && threat < w.wakes) continue;
    // Each watcher lurks for a while, then slips away for a while.
    if (!forced && Math.sin(t * 0.21 + w.phase) < -0.35) continue;
    const blink = (t + w.phase) % w.period;
    if (blink < BLINK_SECONDS) continue;
    const i = w.y * W + w.x;
    if (w.y >= H || !HIDING_PLACES[frame.mat[i]] || !HIDING_PLACES[frame.mat[i + EYE_GAP]]) continue;
    if (lut[(frame.reach[i] << DITHER_BITS) | DITHER_MID] > 0) continue;
    const mat = blink < BLINK_SECONDS * 2 || blink > w.period - BLINK_SECONDS ? MAT.EYE_DIM : MAT.EYE;
    frame.mat[i] = mat;
    frame.mat[i + EYE_GAP] = mat;
  }
}
