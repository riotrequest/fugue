import { MILESTONES } from '../content/story.js';
import { meets } from './conditions.js';
import { applyEffects } from './effects.js';

/**
 * Fires each milestone the first time its condition holds. Milestones are checked
 * in order and checking stops as soon as one opens an event or ends the game, so
 * two scenes never compete for the same moment; the rest are picked up next tick.
 * @param {import('./journal.js').Sim} sim
 */
export function stepStory(sim) {
  const { state } = sim;
  for (const milestone of MILESTONES) {
    if (state.event || state.ended) return;
    const key = `done:${milestone.id}`;
    if (state.flags[key] || !meets(state, milestone.when)) continue;
    state.flags[key] = true;
    applyEffects(sim, milestone.effects);
  }
}
