import { fill, paragraphs } from '../util.js';
import { EVENT_BY_ID } from '../content/events.js';
import { MEMORY_BY_ID } from '../content/memories.js';
import { lacking, pay } from './camp.js';
import { meets } from './conditions.js';
import { applyEffects } from './effects.js';
import { proceed } from './expedition.js';
import { sfx } from './journal.js';

/**
 * Reading and resolving the open modal event.
 *
 * @typedef {object} EventView
 * @property {string} id
 * @property {string} title
 * @property {string} text   paragraphs separated by blank lines
 * @property {string} tone
 * @property {{ id: string, label: string, hint: string|null, enabled: boolean, reason: string|null }[]} choices
 */

const offeredChoices = (state, def) => def.choices.filter((choice) => meets(state, choice.when));

/** @returns {EventView|null} */
export function describeEvent(state) {
  if (!state.event) return null;
  const { id, ctx } = state.event;
  const def = EVENT_BY_ID[id];
  // A memory scene is one generic event that borrows its words from the fragment it shows.
  const prose = ctx.memory ? MEMORY_BY_ID[ctx.memory] : def;

  return {
    id,
    title: fill(prose.title, ctx),
    text: fill(paragraphs(prose.text), ctx),
    tone: def.tone ?? 'normal',
    choices: offeredChoices(state, def).map((choice) => {
      const reason = lacking(state, choice.cost, choice.tools);
      return {
        id: choice.id,
        label: choice.label,
        hint: choice.hint ?? null,
        enabled: reason === null,
        reason,
      };
    }),
  };
}

/**
 * Resolves the open event with the given choice. Its effects may open another
 * event; if they do not and an expedition is under way, the next encounter opens.
 * @returns {boolean} false if there is no such choice or it cannot be afforded
 */
export function choose(sim, choiceId) {
  const { state } = sim;
  if (!state.event || state.ended) return false;
  const { id, ctx } = state.event;
  const choice = offeredChoices(state, EVENT_BY_ID[id]).find((candidate) => candidate.id === choiceId);
  if (!choice || lacking(state, choice.cost, choice.tools) !== null) {
    sfx(sim, 'deny');
    return false;
  }

  pay(state, choice.cost);
  state.event = null;
  sim.emit('eventClosed', { id });

  applyEffects(sim, choice.effects, ctx);
  applyEffects(sim, ctx.then ?? [], ctx);

  if (!state.event && state.expedition && !state.ended) proceed(sim);
  return true;
}
