/** Small deterministic maths helpers shared by the renderer. */

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a, b, t) => a + (b - a) * t;

export function smoothstep(edge0, edge1, x) {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/** Returns `v` if it is a finite number, otherwise `fallback`. */
export const finite = (v, fallback) =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback;

/** Sanitises an untrusted value into the 0..1 range. */
export const unit = (v, fallback = 0) => clamp01(finite(v, fallback));

/** Frame-rate independent exponential ease of `current` toward `target`. */
export const ease = (current, target, rate, dt) =>
  current + (target - current) * (1 - Math.exp(-rate * dt));

/**
 * Seeded PRNG (mulberry32).
 * @param {number} seed
 * @returns {() => number} generator of floats in [0, 1)
 */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stateless integer-lattice hash to [0, 1). */
export function hash2(x, y, seed = 0) {
  let h =
    (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 1274126177)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Hashes any id (string or number) to a non-negative integer. */
export function hashId(id) {
  const text = String(id);
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Bilinear value noise in [0, 1). */
export function valueNoise(x, y, seed = 0) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const top = lerp(hash2(xi, yi, seed), hash2(xi + 1, yi, seed), u);
  const bottom = lerp(hash2(xi, yi + 1, seed), hash2(xi + 1, yi + 1, seed), u);
  return lerp(top, bottom, v);
}

/** Fractal value noise in [0, 1). */
export function fbm(x, y, seed = 0, octaves = 3) {
  let sum = 0;
  let amplitude = 0.5;
  let total = 0;
  for (let o = 0; o < octaves; o++) {
    sum += valueNoise(x, y, seed + o * 17) * amplitude;
    total += amplitude;
    amplitude *= 0.5;
    x *= 2;
    y *= 2;
  }
  return sum / total;
}

/** 4x4 ordered-dither matrix, values 0..15, indexed by ((y & 3) << 2) | (x & 3). */
export const BAYER4 = Uint8Array.of(0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5);
