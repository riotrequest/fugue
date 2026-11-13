/** Small pure helpers shared across the simulation. */

export const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

export const clamp01 = (value) => clamp(value, 0, 1);

export const lerp = (from, to, t) => from + (to - from) * t;

/** Replaces `{key}` placeholders with values from `vars`; unknown keys are left as written. */
export const fill = (text, vars) => text.replace(/\{(\w+)\}/g, (match, key) => vars[key] ?? match);

/** Content may give prose as one string or as a list of paragraphs. */
export const paragraphs = (text) => (Array.isArray(text) ? text.join('\n\n') : text);

/**
 * @template {{ id: string }} T
 * @param {T[]} list
 * @returns {Record<string, T>}
 */
export const indexById = (list) => Object.fromEntries(list.map((entry) => [entry.id, entry]));

/** Small stable string hash (djb2), used to key per-pool bookkeeping without storing the text. */
export function hashOf(text) {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) hash = ((hash * 33) ^ text.charCodeAt(i)) >>> 0;
  return hash.toString(36);
}
