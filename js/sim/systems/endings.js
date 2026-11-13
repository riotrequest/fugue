import { fill, paragraphs } from '../util.js';
import { ENDING_BY_ID } from '../content/endings.js';
import { meets } from './conditions.js';
import { log, sfx } from './journal.js';

const COUNT_WORDS = ['none', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

/**
 * Closes the game with the given ending. The text is chosen now, from the state
 * as it stands, and stored so a reloaded save shows the same words.
 * @param {import('./journal.js').Sim} sim
 * @param {string} id
 */
export function end(sim, id) {
  const { state } = sim;
  if (state.ended) return;

  const def = ENDING_BY_ID[id];
  const variant = def.variants.find((candidate) => meets(state, candidate.when));
  const everyone = state.people.length + 1;
  const text = fill(paragraphs(variant.text), { count: COUNT_WORDS[everyone] ?? String(everyone) });

  state.ended = { id, title: def.title, text };
  state.event = null;
  if (def.death) sfx(sim, 'death');
  sim.emit('ended', { ...state.ended, canContinue: canContinue(state) });
}

/** Whether the current ending lets the player keep going. */
export const canContinue = (state) => Boolean(state.ended && ENDING_BY_ID[state.ended.id]?.afterword);

/**
 * Lifts the curtain after an ending that allows it: the camp carries on from
 * where it stood. Each ending can only happen once, so it will not close again
 * on the same moment.
 * @param {import('./journal.js').Sim} sim
 * @returns {boolean} whether play resumed
 */
export function continueAfterEnding(sim) {
  const { state } = sim;
  if (!canContinue(state)) return false;
  const def = ENDING_BY_ID[state.ended.id];
  state.flags[`continued:${def.id}`] = true;
  state.ended = null;
  log(sim, def.afterword, 'good');
  return true;
}
