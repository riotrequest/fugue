import { amount, bedsOf, isBuilt } from './camp.js';
import { intensityOf } from './fire.js';
import { coldOf, isAway, phaseOf } from './time.js';

/**
 * One small vocabulary of conditions, used by every piece of content that asks
 * "does this apply now?": action visibility and gates, event eligibility, choice
 * availability, milestones, weather, line pools and ending variants.
 *
 * A condition is an object; every key must hold. `{}` and `undefined` always hold.
 *
 * @type {Record<string, (state: import('../state.js').GameState, arg: any) => boolean>}
 */
const TESTS = {
  awake: (s, want) => s.player.awake === want,
  atCamp: (s, want) => !isAway(s) === want,
  flags: (s, ids) => ids.every((id) => s.flags[id]),
  notFlags: (s, ids) => ids.every((id) => !s.flags[id]),
  built: (s, ids) => ids.every((id) => isBuilt(s, id)),
  unbuilt: (s, ids) => ids.every((id) => !isBuilt(s, id)),
  has: (s, needs) => Object.entries(needs).every(([id, count]) => amount(s, id) >= count),
  lacks: (s, ids) => ids.every((id) => amount(s, id) === 0),
  known: (s, ids) => ids.every((id) => s.known.includes(id)),
  counts: (s, needs) => Object.entries(needs).every(([id, count]) => (s.counts[id] ?? 0) >= count),
  memories: (s, ids) => ids.every((id) => s.memories.includes(id)),
  notMemories: (s, ids) => ids.every((id) => !s.memories.includes(id)),
  chapterMin: (s, chapter) => s.chapter >= chapter,
  elapsedMin: (s, seconds) => s.elapsed >= seconds,
  dayMin: (s, day) => s.clock.day >= day,
  popMin: (s, count) => s.people.length >= count,
  sickMin: (s, count) => s.people.filter((person) => person.sick).length >= count,
  room: (s, want) => s.people.length < bedsOf(s) === want,
  coldMin: (s, cold) => coldOf(s) >= cold,
  coldMax: (s, cold) => coldOf(s) < cold,
  phase: (s, phases) => phases.includes(phaseOf(s)),
  weather: (s, ids) => ids.includes(s.weather.id),
  fireLit: (s, want) => s.fire.lit === want,
  fireMin: (s, intensity) => intensityOf(s) >= intensity,
  fireMax: (s, intensity) => intensityOf(s) < intensity,
  vitalMin: (s, floors) => Object.entries(floors).every(([id, floor]) => s.player.vitals[id] >= floor),
  vitalMax: (s, ceilings) => Object.entries(ceilings).every(([id, ceiling]) => s.player.vitals[id] < ceiling),
};

/** Every key a condition may use; content tests check against this. */
export const CONDITION_KEYS = Object.keys(TESTS);

/**
 * @param {import('../state.js').GameState} state
 * @param {object} [condition]
 */
export function meets(state, condition) {
  if (!condition) return true;
  for (const key in condition) {
    const test = TESTS[key];
    if (!test) throw new Error(`Unknown condition "${key}"`);
    if (!test(state, condition[key])) return false;
  }
  return true;
}
