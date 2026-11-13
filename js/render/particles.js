/**
 * Short-lived particles: sparks, smoke, fireflies, drifting ash motes, build
 * dust, memory shimmer and rain splashes. One pooled list, one update, one
 * draw; each kind is a few lines of behaviour.
 */

import { W, H, FIRE_Y, REACH_NEVER } from './constants.js';
import { MAT } from './palette.js';
import { BAYER4 } from './util.js';

/** @enum {number} */
export const KIND = Object.freeze({
  SPARK: 0,
  SMOKE: 1,
  FIREFLY: 2,
  MOTE: 3,
  DUST: 4,
  SHIMMER: 5,
  SPLASH: 6,
});

/**
 * @typedef {object} Particle
 * @property {number} kind
 * @property {number} x
 * @property {number} y
 * @property {number} vx     pixels per second
 * @property {number} vy
 * @property {number} age    seconds lived
 * @property {number} life   seconds to live
 * @property {number} seed   per-particle phase, 0..2π
 */

const MAX_PARTICLES = 420;
const WIND_PUSH = { [KIND.SPARK]: 34, [KIND.SMOKE]: 22, [KIND.MOTE]: 14, [KIND.DUST]: 8 };
const SPARK_DRAG = 0.6;
const SMOKE_MAX_RADIUS = 5;
const SMOKE_DENSITY = 11;
/** Smoke close above the fire is lit from below; reach grows with height. */
const SMOKE_REACH_PER_ROW = 2.4;
const FIREFLY_SPEED = 6;

export function createParticles() {
  /** @type {Particle[]} */
  const live = [];
  const counts = new Uint16Array(Object.keys(KIND).length);

  /** Adds a particle; silently drops it when the pool is full. */
  function spawn(kind, x, y, vx, vy, life) {
    if (live.length >= MAX_PARTICLES) return;
    live.push({ kind, x, y, vx, vy, age: 0, life, seed: Math.random() * Math.PI * 2 });
    counts[kind]++;
  }

  /**
   * @param {number} dt    seconds
   * @param {number} wind  0..1, blowing toward +x
   * @param {number} t     seconds
   */
  function update(dt, wind, t) {
    for (let i = live.length - 1; i >= 0; i--) {
      const p = live[i];
      p.age += dt;
      if (p.age >= p.life || p.x < -8 || p.x > W + 8 || p.y < -8 || p.y > H + 8) {
        counts[p.kind]--;
        live[i] = live[live.length - 1];
        live.pop();
        continue;
      }
      const push = (WIND_PUSH[p.kind] ?? 0) * wind;
      switch (p.kind) {
        case KIND.SPARK:
          p.vx += (push - p.vx * SPARK_DRAG) * dt;
          p.vy += 14 * dt;
          p.x += (p.vx + Math.sin(t * 9 + p.seed) * 6) * dt;
          p.y += p.vy * dt;
          break;
        case KIND.SMOKE:
          p.vx += (push - p.vx) * dt * 0.8;
          p.x += (p.vx + Math.sin(t * 0.9 + p.seed) * 2.5) * dt;
          p.y += p.vy * dt;
          break;
        case KIND.FIREFLY:
          p.x += Math.cos(t * 0.6 + p.seed) * FIREFLY_SPEED * dt;
          p.y += Math.sin(t * 0.9 + p.seed * 2) * FIREFLY_SPEED * 0.5 * dt;
          break;
        case KIND.MOTE:
          p.x += (push + Math.sin(t * 0.7 + p.seed) * 4) * dt;
          p.y += p.vy * dt;
          break;
        default:
          p.x += (p.vx + push) * dt;
          p.y += p.vy * dt;
      }
    }
  }

  function drawSmoke(frame, p) {
    const k = p.age / p.life;
    const radius = 1 + Math.round(k * SMOKE_MAX_RADIUS);
    const alpha = (1 - k) * SMOKE_DENSITY;
    const cx = Math.round(p.x);
    const cy = Math.round(p.y);
    const mat = k < 0.3 ? MAT.SMOKE_L : MAT.SMOKE;
    for (let dy = -radius; dy <= radius; dy++) {
      const y = cy + dy;
      if (y < 0 || y >= H) continue;
      const reach = Math.min(REACH_NEVER, Math.max(0, (FIRE_Y - y) * SMOKE_REACH_PER_ROW));
      for (let dx = -radius; dx <= radius; dx++) {
        const x = cx + dx;
        if (x < 0 || x >= W || dx * dx + dy * dy > radius * radius + 1) continue;
        if (BAYER4[((y & 3) << 2) | (x & 3)] >= alpha) continue;
        frame.mat[y * W + x] = mat;
        frame.reach[y * W + x] = reach;
      }
    }
  }

  /**
   * @param {import('./surface.js').Surface} frame
   * @param {number} t seconds
   */
  function draw(frame, t) {
    for (const p of live) {
      const x = Math.round(p.x);
      const y = Math.round(p.y);
      const k = p.age / p.life;
      switch (p.kind) {
        case KIND.SMOKE:
          drawSmoke(frame, p);
          break;
        case KIND.SPARK:
          frame.paint(x, y, k < 0.55 ? MAT.SPARK : MAT.SPARK_D);
          break;
        case KIND.FIREFLY: {
          // Fade in and out at the ends of life, and blink in between.
          const present = Math.min(p.age, p.life - p.age) > 0.6;
          if (present && Math.sin(t * 2.2 + p.seed * 3) > -0.2) frame.paint(x, y, MAT.FIREFLY);
          break;
        }
        case KIND.MOTE:
          frame.paint(x, y, p.seed > 3 ? MAT.ASHFLAKE : MAT.ASHFLAKE_D);
          break;
        case KIND.DUST:
          if (BAYER4[((y & 3) << 2) | (x & 3)] < (1 - k) * 20) {
            frame.paint(x, y, MAT.DUST);
            frame.paint(x + 1, y, MAT.DUST);
          }
          break;
        case KIND.SHIMMER:
          if (Math.sin(t * 11 + p.seed * 5) > 0.1 - k) frame.paint(x, y, MAT.SHIMMER);
          break;
        case KIND.SPLASH:
          if (k < 0.45) frame.paint(x, y, MAT.SPLASH);
          else {
            frame.paint(x - 1, y - 1, MAT.SPLASH);
            frame.paint(x + 1, y - 1, MAT.SPLASH);
          }
          break;
      }
    }
  }

  return { spawn, update, draw, /** Live particles of a kind. */ count: (kind) => counts[kind] };
}
