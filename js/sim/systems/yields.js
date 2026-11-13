import { lerp } from '../util.js';
import { GAME_GROUNDS } from '../content/game.js';
import { add, amount } from './camp.js';
import { abundanceOf } from './weather.js';

/**
 * Snares or the spear: maybe catches one animal from the ground's table and puts
 * what it yields into the stores. Lean times make any catch less likely, and big
 * game rarer still.
 * @param {import('./journal.js').Sim} sim
 * @param {string} groundId  a GAME_GROUNDS key
 * @param {(toolId: string) => number} [toolShare]  see rollYields
 * @returns {import('../content/game.js').Catch|null} what was caught, if anything
 */
export function catchGame(sim, groundId, toolShare) {
  const { state, rng } = sim;
  const ground = GAME_GROUNDS[groundId];
  const abundance = abundanceOf(state);
  if (!rng.chance(lerp(1, abundance, ground.scarce))) return null;
  const animal = rng.weighted(ground.catches, (entry) => entry.weight * lerp(1, abundance, entry.scarce ?? 0));
  rollYields(sim, animal.yields, toolShare);
  return animal;
}

/**
 * One line of a yield table, shared by gathering actions and working roles.
 *
 * @typedef {object} YieldDef
 * @property {string} id                  resource produced
 * @property {number|[number, number]} amount   fixed, or an inclusive range
 * @property {number} [chance]            probability of this line yielding at all
 * @property {string} [tool]              gear that improves the yield…
 * @property {number} [toolFactor]        …by this factor
 * @property {number} [scarce]            0..1: how strongly season and weather thin it out
 */

/**
 * Rolls a yield table into the stores.
 * @param {import('./journal.js').Sim} sim
 * @param {YieldDef[]} yields
 * @param {(toolId: string) => number} [toolShare]  0..1, how much of the work has the tool in hand.
 *   The player needs only one; a job's workers need one each (see work.js).
 * @returns {number[]} how much each line turned up, before any storage limit
 */
export function rollYields(sim, yields, toolShare = (id) => (amount(sim.state, id) > 0 ? 1 : 0)) {
  const { state, rng } = sim;
  return yields.map((line) => {
    if (line.chance !== undefined && !rng.chance(line.chance)) return 0;
    let count = Array.isArray(line.amount) ? rng.int(...line.amount) : line.amount;
    if (line.tool) count *= lerp(1, line.toolFactor, toolShare(line.tool));
    if (line.scarce) count *= lerp(1, abundanceOf(state), line.scarce);
    const found = rng.round(count);
    add(state, line.id, found);
    return found;
  });
}
