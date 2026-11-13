/**
 * The sliver of sky above the clearing, the far forest silhouettes in front
 * of it, and the stars. None of it is ever touched by firelight.
 */

import { W, HORIZON_Y, REACH_NEVER, WORLD_SEED } from '../constants.js';
import { MAT, IS_SKY } from '../palette.js';
import { BAYER4, hash2, mulberry32 } from '../util.js';

const SKY_BANDS = [MAT.SKY_HI, MAT.SKY_MID, MAT.SKY_LO];
/** Row at which the sky gradient reaches its lowest band. */
const SKY_GRADIENT_ROWS = 30;
const STAR_COUNT = 46;
const STAR_ROWS = 26;
const STAR_VISIBLE_MIN = 0.05;

/** Two ranks of conifer silhouettes, the nearer one darker and lower. */
const FAR_RANKS = [
  { mat: MAT.FAR1, baseline: 25, minHeight: 6, maxHeight: 15, spacing: 7, seed: 1 },
  { mat: MAT.FAR2, baseline: 33, minHeight: 6, maxHeight: 17, spacing: 9, seed: 2 },
];
/** Below this row everything behind the trunks is lightless forest depth. */
const DEPTH_ROW = 33;

/**
 * Paints the sky gradient and far forest into the backdrop.
 * @param {import('../surface.js').Surface} surface
 */
export function paintSky(surface) {
  for (let y = 0; y < HORIZON_Y; y++) {
    for (let x = 0; x < W; x++) {
      const position = (y / SKY_GRADIENT_ROWS) * (SKY_BANDS.length - 1);
      const dither = (BAYER4[((y & 3) << 2) | (x & 3)] - 7.5) / 16;
      const band = Math.max(0, Math.min(SKY_BANDS.length - 1, Math.round(position + dither * 0.9)));
      surface.set(x, y, SKY_BANDS[band], REACH_NEVER);
    }
  }

  for (const rank of FAR_RANKS) {
    const rng = mulberry32(WORLD_SEED + rank.seed);
    const top = new Float32Array(W).fill(rank.baseline);
    for (let x = -6; x < W + 6; x += Math.round(rank.spacing * (0.6 + rng() * 0.8))) {
      const height = rank.minHeight + rng() * (rank.maxHeight - rank.minHeight);
      const halfWidth = 2.5 + height * 0.22;
      for (let dx = -Math.ceil(halfWidth); dx <= Math.ceil(halfWidth); dx++) {
        const px = x + dx;
        if (px < 0 || px >= W) continue;
        // Pointed crowns whose flanks step down in pairs of rows, like boughs.
        const slope = Math.max(0, 1 - Math.abs(dx) / (halfWidth + 0.5));
        top[px] = Math.min(top[px], rank.baseline - Math.floor((height * slope) / 2) * 2);
      }
    }
    for (let x = 0; x < W; x++) {
      const start = Math.round(top[x] + (hash2(x, rank.seed, 5) < 0.3 ? 1 : 0));
      for (let y = Math.max(0, start); y < HORIZON_Y; y++) surface.set(x, y, rank.mat, REACH_NEVER);
    }
  }

  for (let y = DEPTH_ROW; y < HORIZON_Y; y++) {
    const cover = ((y - DEPTH_ROW + 1) / (HORIZON_Y - DEPTH_ROW)) * 16;
    for (let x = 0; x < W; x++) {
      if (BAYER4[((y & 3) << 2) | (x & 3)] < cover) surface.set(x, y, MAT.DEPTH, REACH_NEVER);
    }
  }
}

/**
 * @typedef {object} Star
 * @property {number} x
 * @property {number} y
 * @property {number} phase  twinkle phase offset
 * @property {number} rate   twinkle speed
 * @property {boolean} faint
 */

/** @returns {Star[]} */
export function createStars() {
  const rng = mulberry32(WORLD_SEED + 77);
  const stars = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    stars.push({
      x: Math.floor(rng() * W),
      y: Math.floor(rng() * rng() * STAR_ROWS),
      phase: rng() * Math.PI * 2,
      rate: 0.6 + rng() * 1.8,
      faint: rng() < 0.45,
    });
  }
  return stars;
}

/**
 * Draws twinkling stars wherever open sky is still showing.
 * @param {import('../surface.js').Surface} frame
 * @param {Star[]} stars
 * @param {number} visibility 0..1
 * @param {number} t seconds
 */
export function drawStars(frame, stars, visibility, t) {
  if (visibility < STAR_VISIBLE_MIN) return;
  for (const s of stars) {
    const i = s.y * W + s.x;
    if (!IS_SKY[frame.mat[i]]) continue;
    const twinkle = Math.sin(t * s.rate + s.phase);
    if (twinkle < -0.75) continue;
    frame.mat[i] = s.faint || twinkle < 0 ? MAT.STAR_DIM : MAT.STAR;
  }
}
