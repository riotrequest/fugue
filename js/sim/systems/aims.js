import { AIMS } from '../content/aims.js';
import { meets } from './conditions.js';
import { chronicle } from './history.js';
import { log, sfx } from './journal.js';

/**
 * Long-term aims (content/aims.js). Checked every few seconds; the first time
 * one holds it is marked, logged and chronicled, and it stays achieved.
 *
 * @typedef {object} AimView
 * @property {string} id
 * @property {string} title
 * @property {string} hint
 * @property {boolean} done
 */

/** Seconds between checks: aims are slow things. */
const CHECK_EVERY = 5;

const isDone = (state, id) => Boolean(state.flags[`aim:${id}`]);

/** @param {import('./journal.js').Sim} sim */
export function stepAims(sim) {
  const { state } = sim;
  if (!state.flags.notebook || state.elapsed < (state.timers.aims ?? 0)) return;
  state.timers.aims = state.elapsed + CHECK_EVERY;
  for (const aim of AIMS) {
    if (isDone(state, aim.id) || !meets(state, aim.when)) continue;
    state.flags[`aim:${aim.id}`] = true;
    log(sim, aim.done, 'good');
    chronicle(state, `${aim.title}.`);
    sfx(sim, 'unlock');
  }
}

/** @returns {AimView[]} */
export const aimsView = (state) =>
  AIMS.map((aim) => ({ id: aim.id, title: aim.title, hint: aim.hint, done: isDone(state, aim.id) }));
