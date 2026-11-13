import { TRUST } from '../tuning.js';
import { EVENT_BY_ID } from '../content/events.js';
import { freshName } from './people.js';

/**
 * Opening a modal event, and choosing who it is about. Kept apart from choosing
 * (events.js) so that effects can open the next event of a chain without
 * importing the code that applies effects.
 *
 * A cast fills `{name}` (and `{other}`, `{lost}`) in the prose, and tells
 * effects aimed at 'cast' or 'other' whom they touch. Kinds:
 *   newcomer   a stranger with a fresh name
 *   survivor   anyone at the fire          worker   anyone with a job
 *   loyal      someone who trusts you      wary     someone who does not
 *   guard      someone on watch            sick     someone laid up
 *   arcless    someone settled in who has no story of their own yet
 *   pair       two people with no bond     friends  two friends or partners
 *   rivals     two people at odds
 *   mourner    anyone, and `{lost}`: the name of someone buried
 *   returning  someone who once walked out, back at the edge of the light
 */

const trustOf = (person) => person.trust ?? TRUST.start;
const settled = (state, person) => state.elapsed - (person.since ?? 0) >= 240;

/** Everyone at the fire who could play a single-person part. */
function singles(state, kind) {
  const { people } = state;
  switch (kind) {
    case 'survivor':
    case 'mourner':
      return people;
    case 'worker':
      return people.filter((person) => person.role);
    case 'loyal':
      return people.filter((person) => trustOf(person) >= TRUST.loyal && !person.sick);
    case 'wary':
      return people.filter((person) => trustOf(person) < TRUST.wary);
    case 'guard':
      return people.filter((person) => person.role === 'guard');
    case 'sick':
      return people.filter((person) => person.sick);
    case 'arcless':
      return people.filter((person) => !person.arc && !person.sick && settled(state, person));
    default:
      return [];
  }
}

/** Every pair that could play a two-person part, as [a, b]. */
function pairs(state, kind) {
  const found = [];
  const { people } = state;
  for (let i = 0; i < people.length; i++) {
    for (let j = i + 1; j < people.length; j++) {
      const a = people[i];
      const b = people[j];
      const bond = a.bonds?.[b.id];
      const fits =
        kind === 'pair' ? !bond && settled(state, a) && settled(state, b)
          : kind === 'friends' ? bond === 'friend' || bond === 'partner'
            : kind === 'rivals' ? bond === 'rival'
              : false;
      if (fits) found.push([a, b]);
    }
  }
  return found;
}

const PAIRED = ['pair', 'friends', 'rivals'];

/** Days someone stays gone before they might think better of it. */
const AWAY_DAYS = 2;

/** People who once walked out and might come back. */
const returners = (state) =>
  (state.history?.gone ?? []).filter(
    (entry) => !entry.exiled && !entry.returned && state.clock.day - entry.day >= AWAY_DAYS,
  );

/** Whether an event's cast can be filled right now. */
export function castable(state, def) {
  const kind = def.cast;
  if (!kind || kind === 'newcomer') return true;
  if (PAIRED.includes(kind)) return pairs(state, kind).length > 0;
  if (kind === 'returning') return returners(state).length > 0;
  if (kind === 'mourner') return state.people.length > 0 && (state.history?.dead.length ?? 0) > 0;
  return singles(state, kind).length > 0;
}

/**
 * Decides who an event is about.
 * @param {import('./journal.js').Sim} sim
 * @param {{ cast?: string }} def
 * @returns {object} the cast, or {} when the event needs no one (or no one fits)
 */
export function castFor(sim, def) {
  const { state, rng } = sim;
  const kind = def.cast;
  if (kind === 'newcomer') return { name: freshName(sim) };
  if (kind === 'returning') {
    const entry = rng.pick(returners(state) ?? []);
    return entry ? { name: entry.name, returning: entry.id } : {};
  }
  if (PAIRED.includes(kind)) {
    const options = pairs(state, kind);
    if (options.length === 0) return {};
    const [a, b] = rng.shuffle(rng.pick(options));
    return { name: a.name, person: a.id, other: b.name, otherId: b.id };
  }
  const options = singles(state, kind);
  if (options.length === 0) return {};
  const person = rng.pick(options);
  const cast = { name: person.name, person: person.id };
  if (kind === 'mourner') cast.lost = rng.pick(state.history.dead).name;
  return cast;
}

/**
 * @param {import('./journal.js').Sim} sim
 * @param {string} id
 * @param {object} [ctx]  JSON data carried with the event: its cast, a memory to show,
 *                        effects to apply once it closes. A cast already present is kept.
 */
export function openEvent(sim, id, ctx = {}) {
  const { state } = sim;
  const cast = ctx.name === undefined ? castFor(sim, EVENT_BY_ID[id]) : {};
  state.event = { id, ctx: { ...cast, ...ctx } };
  state.seen[id] = state.elapsed;
  sim.emit('event', { id });
}
