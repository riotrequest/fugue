/**
 * What the settlement remembers: who is buried, who walked out, and a short
 * chronicle of the turns that mattered. Kept compact on purpose (a few dozen
 * entries, not a log) so later writing can refer back to it: a survivor setting
 * a place for someone twenty days dead, a face from the first winter at the edge
 * of the light.
 *
 * @typedef {import('./journal.js').Sim} Sim
 * @typedef {import('../state.js').Person} Person
 */

/** Chronicle entries kept; the oldest give way. */
const RECORDS_KEPT = 40;
/** People who walked out, remembered for a possible return. */
const GONE_KEPT = 16;

const historyOf = (state) => (state.history ??= { dead: [], gone: [], records: [] });

/** Adds a line to the chronicle. */
export function chronicle(state, text) {
  const { records } = historyOf(state);
  records.push({ day: state.clock.day, text });
  if (records.length > RECORDS_KEPT) records.splice(0, records.length - RECORDS_KEPT);
}

/** @param {string} cause  'cold' | 'hunger' | 'sickness' | 'wounds' | … */
export function recordDeath(state, person, cause) {
  historyOf(state).dead.push({ name: person.name, day: state.clock.day, cause });
  chronicle(state, `${person.name} died, on day ${state.clock.day}.`);
}

/** Someone walked out, or was sent away. */
export function recordGone(state, person, exiled) {
  const { gone } = historyOf(state);
  gone.push({
    id: person.id,
    name: person.name,
    day: state.clock.day,
    trait: person.trait ?? 'steady',
    trust: person.trust ?? 0.5,
    exiled,
    seed: person.seed,
  });
  if (gone.length > GONE_KEPT) gone.splice(0, gone.length - GONE_KEPT);
  chronicle(state, exiled ? `${person.name} was sent away.` : `${person.name} walked out.`);
}

/** Someone who came back and was not let in: they will not try again. */
export function turnedBack(state, id) {
  const entry = historyOf(state).gone.find((gone) => gone.id === id);
  if (entry) entry.returned = true;
}

/** The read model for the journal: the chronicle, newest last, and the names of the dead. */
export function historyView(state) {
  const { dead, records } = historyOf(state);
  return {
    records: records.map((entry) => ({ ...entry })),
    dead: dead.map((entry) => ({ ...entry })),
  };
}
