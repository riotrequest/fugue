import { DIFFICULTY } from '../tuning.js';

/**
 * The chosen difficulty, as a set of multipliers (see DIFFICULTY in tuning.js).
 * Saves from before difficulty existed play as normal.
 * @param {import('../state.js').GameState} state
 */
export const dialOf = (state) => DIFFICULTY[state.difficulty] ?? DIFFICULTY.normal;

export const isDifficulty = (id) => Object.hasOwn(DIFFICULTY, id);
