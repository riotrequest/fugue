/**
 * Indexed pixel surfaces.
 *
 * A Surface is a tiny three-channel image: a material id, a firelight "reach"
 * and a snow threshold per pixel. Sprites, pre-rendered static layers and the
 * per-frame framebuffer are all Surfaces, so one set of primitives draws them.
 *
 * Reach is the distance (in ground pixels) the firelight has to travel before
 * it touches the pixel. In a sprite it is relative to the sprite's base point;
 * once stamped into a full-screen layer it is absolute.
 */

import { W, H, REACH_NEVER } from './constants.js';
import { MAT } from './palette.js';
import { BAYER4 } from './util.js';

/** Dither alpha meaning "fully opaque" (one more than the largest Bayer value). */
export const OPAQUE = 16;
/** How long a snow pixel stays frost-coloured after it first appears (in cold bytes). */
const FROST_BAND = 26;

export class Surface {
  /**
   * @param {number} w
   * @param {number} h
   */
  constructor(w, h) {
    this.w = w;
    this.h = h;
    /** Material id per pixel; 0 is transparent. */
    this.mat = new Uint8Array(w * h);
    /** Firelight reach per pixel; REACH_NEVER is never lit. */
    this.reach = new Uint8Array(w * h);
    /** Cold (1..255) at which the pixel turns to snow; 0 never does. */
    this.snow = new Uint8Array(w * h);
  }

  set(x, y, mat, reach = 0, snow = 0) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = y * this.w + x;
    this.mat[i] = mat;
    this.reach[i] = reach < 0 ? 0 : reach > REACH_NEVER ? REACH_NEVER : reach;
    this.snow[i] = snow;
  }

  /** Replaces only the material, so the pixel keeps the light of what was behind it. */
  paint(x, y, mat) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.mat[y * this.w + x] = mat;
  }

  /** Material at (x, y), or 0 outside the surface. */
  get(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return MAT.NONE;
    return this.mat[y * this.w + x];
  }

  rect(x, y, w, h, mat, reach = 0, snow = 0) {
    for (let py = y; py < y + h; py++) {
      for (let px = x; px < x + w; px++) this.set(px, py, mat, reach, snow);
    }
  }

  /** Bresenham line, inclusive of both ends. */
  line(x0, y0, x1, y1, mat, reach = 0, snow = 0) {
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, mat, reach, snow);
      if (x0 === x1 && y0 === y1) return;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  copyFrom(source) {
    this.mat.set(source.mat);
    this.reach.set(source.reach);
    this.snow.set(source.snow);
  }

  /**
   * Permanently stamps a sprite into this surface, turning its relative reach
   * into absolute reach.
   */
  stamp(sprite, x, y, baseReach = 0) {
    for (let sy = 0; sy < sprite.h; sy++) {
      for (let sx = 0; sx < sprite.w; sx++) {
        const i = sy * sprite.w + sx;
        if (sprite.mat[i]) this.set(x + sx, y + sy, sprite.mat[i], baseReach + sprite.reach[i], sprite.snow[i]);
      }
    }
  }
}

/**
 * Self-shadows a sprite: every pixel's reach grows with the amount of sprite
 * the firelight must cross to get to it, which leaves a warm rim on the side
 * facing the fire and darkness behind it.
 * @param {Surface} sprite
 * @param {number} dirX      unit vector pointing from the sprite toward the fire
 * @param {number} dirY
 * @param {number} perPixel  reach added per pixel of depth
 * @param {number} maxDepth  depth at which shading saturates
 */
export function shadeToward(sprite, dirX, dirY, perPixel, maxDepth) {
  const { w, h, mat, reach } = sprite;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!mat[i] || reach[i] === REACH_NEVER) continue;
      let depth = 0;
      while (depth < maxDepth) {
        const step = depth + 1;
        if (!sprite.get(x + Math.round(dirX * step), y + Math.round(dirY * step))) break;
        depth++;
      }
      reach[i] = Math.min(REACH_NEVER - 1, reach[i] + depth * perPixel);
    }
  }
}

/**
 * Draws rows [row0, row1) of a sprite into the framebuffer.
 * @param {Surface} frame
 * @param {Surface} sprite
 * @param {number} x          destination of the sprite's left edge
 * @param {number} y          destination of the sprite's row 0
 * @param {number} baseReach  absolute reach of the sprite's base point
 * @param {boolean} [flip]    mirror horizontally
 * @param {number} [alpha]    0..OPAQUE ordered-dither coverage
 */
export function blit(frame, sprite, x, y, baseReach, flip = false, alpha = OPAQUE, row0 = 0, row1 = sprite.h) {
  const { w, mat, reach } = sprite;
  for (let sy = row0; sy < row1; sy++) {
    const dy = y + sy;
    if (dy < 0 || dy >= H) continue;
    const srcRow = sy * w;
    const dstRow = dy * W;
    const bayerRow = (dy & 3) << 2;
    for (let sx = 0; sx < w; sx++) {
      const si = srcRow + (flip ? w - 1 - sx : sx);
      const m = mat[si];
      if (!m) continue;
      const dx = x + sx;
      if (dx < 0 || dx >= W) continue;
      if (alpha < OPAQUE && BAYER4[bayerRow | (dx & 3)] >= alpha) continue;
      const r = baseReach + reach[si];
      frame.mat[dstRow + dx] = m;
      frame.reach[dstRow + dx] = r > REACH_NEVER ? REACH_NEVER : r;
    }
  }
}

/**
 * Resolves snow cover: writes `source.mat` into `out`, replacing every pixel
 * whose snow threshold has been reached. Fresh cover starts as frost, and the
 * lower lip of each drift is shaded to give it thickness.
 * @param {Surface} source
 * @param {Uint8Array} out   same size as source.mat
 * @param {number} cold      0..255
 */
export function resolveSnow(source, out, cold) {
  const { w, mat, snow } = source;
  const n = mat.length;
  for (let i = 0; i < n; i++) {
    const threshold = snow[i];
    if (threshold === 0 || cold < threshold) out[i] = mat[i];
    else out[i] = cold - threshold < FROST_BAND ? MAT.FROST : MAT.SNOW;
  }
  for (let i = 0; i < n - w; i++) {
    if (out[i] === MAT.SNOW && out[i + w] !== MAT.SNOW && out[i + w] !== MAT.FROST) out[i] = MAT.SNOW_SH;
  }
}
