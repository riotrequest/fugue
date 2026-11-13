/**
 * Small numeric helpers shared by the audio modules.
 */

/** Relative change below which an eased parameter is left alone. */
const EASE_RELATIVE_EPSILON = 0.004;
/** Absolute change below which an eased parameter is left alone. */
const EASE_ABSOLUTE_EPSILON = 1e-5;

/** @param {number} value */
export const clamp01 = (value) => Math.min(1, Math.max(0, value));

/**
 * @param {number} from
 * @param {number} to
 * @param {number} t 0..1
 */
export const lerp = (from, to, t) => from + (to - from) * t;

/**
 * Hermite step: 0 below `edge0`, 1 above `edge1`, smooth in between.
 * @param {number} edge0
 * @param {number} edge1
 * @param {number} x
 */
export function smoothstep(edge0, edge1, x) {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/**
 * @param {number} min
 * @param {number} max
 */
export const rand = (min, max) => min + Math.random() * (max - min);

/**
 * @template T
 * @param {readonly T[]} list
 * @returns {T}
 */
export const pick = (list) => list[Math.floor(Math.random() * list.length)];

/**
 * Reads an untrusted value as a 0..1 quantity.
 * @param {unknown} value
 * @param {number} fallback used when the value is not a finite number
 */
export function unit(value, fallback) {
  return typeof value === 'number' && Number.isFinite(value) ? clamp01(value) : fallback;
}

/**
 * @callback Ease
 * @param {number} value target value
 * @param {number} now   AudioContext time
 * @returns {void}
 */

/**
 * Wraps an AudioParam so it glides toward targets without clicks. Repeated
 * calls with an unchanged target schedule nothing, which keeps the automation
 * timeline short when called from a control loop.
 * @param {AudioParam} param
 * @param {number} timeConstant seconds; the glide covers ~63% per constant
 * @returns {Ease}
 */
export function createEase(param, timeConstant) {
  let target = param.value;
  return (value, now) => {
    const tolerance = EASE_ABSOLUTE_EPSILON + EASE_RELATIVE_EPSILON * Math.max(Math.abs(value), Math.abs(target));
    if (Math.abs(value - target) <= tolerance) return;
    target = value;
    param.setTargetAtTime(value, now, timeConstant);
  };
}
