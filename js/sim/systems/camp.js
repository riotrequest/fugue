import { PEOPLE } from '../tuning.js';
import { RESOURCE_BY_ID } from '../content/resources.js';
import { BUILDING_BY_ID } from '../content/buildings.js';
import { RECIPES } from '../content/recipes.js';
import { PROJECT_BY_ID } from '../content/research.js';

/**
 * What the camp holds and what it has built: stores, storage limits, and the
 * passive bonuses that structures and gear contribute.
 *
 * @typedef {import('../state.js').GameState} GameState
 */

/** @param {GameState} state @param {string} id */
export const amount = (state, id) => state.resources[id] ?? 0;

/** @param {GameState} state @param {string} id */
export const isBuilt = (state, id) => state.built.includes(id);

/** Structures built and gear owned: everything that can carry a passive bonus. */
function* holdings(state) {
  for (const id of state.built) yield BUILDING_BY_ID[id];
  for (const recipe of RECIPES) if (amount(state, recipe.id) > 0) yield recipe;
  for (const id of state.research?.done ?? []) if (PROJECT_BY_ID[id]) yield PROJECT_BY_ID[id];
}

/** Share added to one job's working speed by everything the camp has (`pace: { roleId: n }`). */
export function paceBonus(state, roleId) {
  let total = 0;
  for (const holding of holdings(state)) total += holding.pace?.[roleId] ?? 0;
  return total;
}

/**
 * Sum of a numeric bonus (`beds`, `warmth`, `shelter`, `ward`, `watch`, `smoke`, `haul`)
 * across everything the camp has.
 * @param {GameState} state
 * @param {string} key
 */
export function bonus(state, key) {
  let total = 0;
  for (const holding of holdings(state)) total += holding[key] ?? 0;
  return total;
}

/** @returns {number|null} storage limit, or null when unlimited */
export function capOf(state, id) {
  const base = RESOURCE_BY_ID[id].cap;
  if (base === null) return null;
  let extra = 0;
  for (const holding of holdings(state)) extra += holding.caps?.[id] ?? 0;
  return base + extra;
}

export const isFull = (state, id) => {
  const cap = capOf(state, id);
  return cap !== null && amount(state, id) >= cap;
};

export const bedsOf = (state) => PEOPLE.baseBeds + bonus(state, 'beds');

/**
 * Adds to the stores, up to the cap. The first unit of anything marks it as known.
 * @returns {number} how much actually fit
 */
export function add(state, id, count) {
  const cap = capOf(state, id);
  const before = amount(state, id);
  const after = cap === null ? before + count : Math.min(cap, before + count);
  if (after > before) {
    state.resources[id] = after;
    if (!state.known.includes(id)) state.known.push(id);
  }
  return after - before;
}

/** Removes up to `count`; stores never go below zero. */
export function remove(state, id, count) {
  if (id in state.resources) state.resources[id] = Math.max(0, state.resources[id] - count);
}

export const canAfford = (state, cost = {}) =>
  Object.entries(cost).every(([id, count]) => amount(state, id) >= count);

export function pay(state, cost = {}) {
  for (const [id, count] of Object.entries(cost)) remove(state, id, count);
}

/**
 * Why a cost or tool requirement cannot be met right now.
 * @param {GameState} state
 * @param {Record<string, number>} [cost]
 * @param {string[]} [tools]
 * @returns {string|null}
 */
export function lacking(state, cost = {}, tools = []) {
  const tool = tools.find((id) => amount(state, id) === 0);
  if (tool) return `needs a ${RESOURCE_BY_ID[tool].label}`;
  const short = Object.keys(cost).find((id) => amount(state, id) < cost[id]);
  if (!short) return null;
  const { label, source } = RESOURCE_BY_ID[short];
  return source ? `not enough ${label}: ${source}` : `not enough ${label}`;
}

/**
 * Adds fractional work to a named accumulator and returns the whole units now
 * complete, keeping the remainder for next time.
 */
export function accrue(state, key, work) {
  const total = (state.progress[key] ?? 0) + work;
  const whole = Math.floor(total);
  state.progress[key] = total - whole;
  return whole;
}
