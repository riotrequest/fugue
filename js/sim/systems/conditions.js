import { TRUST } from '../tuning.js';
import { amount, bedsOf, isBuilt } from './camp.js';
import { intensityOf } from './fire.js';
import { coldOf, isAway, phaseOf, seasonIdOf, yearOf, yearPhaseOf } from './time.js';

const trustOf = (person) => person.trust ?? TRUST.start;
const chainOf = (s, id) => s.chains?.[id];
const bondCount = (s, kind) =>
  s.people.reduce((sum, person) => sum + Object.values(person.bonds ?? {}).filter((k) => !kind || k === kind).length, 0) / 2;

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

  /** Holds when any one of the listed conditions holds. */
  anyOf: (s, list) => list.some((condition) => meets(s, condition)),
  /** Seconds the fire has spent roaring, all told. */
  roaringMin: (s, seconds) => (s.roaring ?? 0) >= seconds,
  chainsNew: (s, ids) => ids.every((id) => !chainOf(s, id)),
  chainsDone: (s, ids) => ids.every((id) => chainOf(s, id)?.done),
  chainsLive: (s, ids) => ids.every((id) => chainOf(s, id) && !chainOf(s, id).done),
  /** The notebook: projects finished. */
  researched: (s, ids) => ids.every((id) => s.research?.done.includes(id)),
  /** At least this many survivors who trust you (loyal), or who do not (wary). */
  loyalMin: (s, count) => s.people.filter((person) => trustOf(person) >= TRUST.loyal).length >= count,
  waryMin: (s, count) => s.people.filter((person) => trustOf(person) < TRUST.wary).length >= count,
  /** At least this many pairs of friends, rivals or partners ({ any: n } counts every kind). */
  bondsMin: (s, needs) => Object.entries(needs).every(([kind, count]) => bondCount(s, kind === 'any' ? null : kind) >= count),
  /** The settlement's memory: people buried, people who walked out (not driven). */
  deadMin: (s, count) => (s.history?.dead.length ?? 0) >= count,
  goneMin: (s, count) => (s.history?.gone.filter((entry) => !entry.returned).length ?? 0) >= count,
  /** The turning year: 'first-winter', then 'spring', 'summer', 'autumn', 'winter'. */
  season: (s, ids) => ids.includes(seasonIdOf(s)),
  /** Winters lived through: 1 in the first, 2 after the first thaw. */
  yearMin: (s, year) => yearOf(s) >= year,
  /** Fewer than this many days left in the season (after the first thaw only). */
  seasonLeftMax: (s, days) => (yearPhaseOf(s)?.left ?? Infinity) < days,
  /** At least this many of the camp's long-term aims achieved (content/aims.js). */
  aimsMin: (s, count) => Object.keys(s.flags).filter((flag) => flag.startsWith('aim:')).length >= count,
  /** At least this share of the survivors trust you (loyal or better). */
  loyalShare: (s, share) => s.people.length > 0 && s.people.filter((person) => trustOf(person) >= TRUST.loyal).length >= share * s.people.length,
  /** Notebook projects finished, all told. */
  researchMin: (s, count) => (s.research?.done.length ?? 0) >= count,
  /** Memories recovered, all told. */
  memoriesMin: (s, count) => s.memories.length >= count,
  /** Survivors' own stories (personal arcs) seen through to their end. */
  arcsMin: (s, count) => Object.values(s.chains ?? {}).filter((entry) => entry.done && entry.arc && entry.steps).length >= count,
  /** Structures standing, all told. */
  builtMin: (s, count) => s.built.length >= count,
  /** Trips made to each place. */
  visitsMin: (s, needs) => Object.entries(needs).every(([id, count]) => (s.visits[id] ?? 0) >= count),
  /** Any one of these flags. */
  anyFlags: (s, ids) => ids.some((id) => s.flags[id]),
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
