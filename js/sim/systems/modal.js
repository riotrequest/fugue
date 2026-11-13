import { EVENT_BY_ID } from '../content/events.js';
import { freshName } from './people.js';

/**
 * Opening a modal event. Kept apart from choosing (events.js) so that effects can
 * open the next event of a chain without importing the code that applies effects.
 */

/** Decides who `{name}` refers to for events that need a person. */
function castFor(sim, def) {
  if (def.cast === 'newcomer') return { name: freshName(sim) };
  if (def.cast === 'survivor' && sim.state.people.length > 0) {
    const person = sim.rng.pick(sim.state.people);
    return { name: person.name, person: person.id };
  }
  return {};
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
