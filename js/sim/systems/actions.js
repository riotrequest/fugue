import { ACTION_BY_ID, ACTION_DEFS, ACTION_GROUPS } from '../content/actions.js';
import { RESOURCE_BY_ID } from '../content/resources.js';
import { amount, isFull, lacking, pay } from './camp.js';
import { meets } from './conditions.js';
import { applyEffects } from './effects.js';
import { log, sfx } from './journal.js';
import { PARALLEL_TIP } from '../content/lines.js';
import { PARALLEL_TIP_AFTER } from '../tuning.js';

/**
 * Listing and performing the player's actions.
 *
 * @typedef {object} ActionView
 * @property {string} id
 * @property {string} label
 * @property {string} group
 * @property {string} groupLabel
 * @property {string} hint
 * @property {{ id: string, label: string, amount: number, have: number }[]} cost
 * @property {boolean} enabled
 * @property {string|null} reason                why it cannot be done, when that needs saying
 * @property {{ remaining: number, total: number }|null} cooldown   real seconds
 */

/** Why a visible action cannot be performed, cooldown aside. */
function blockOf(state, def) {
  const gate = def.gates?.find(({ when }) => !meets(state, when));
  if (gate) return gate.reason;
  if (def.fills && isFull(state, def.fills)) {
    const resource = RESOURCE_BY_ID[def.fills];
    return resource.group === 'gear' ? 'have all you need' : `no room for more ${resource.label}`;
  }
  return lacking(state, def.cost, def.tools);
}

function cooldownOf(state, def) {
  const cooling = state.cooldowns[def.shares ?? def.id];
  if (!cooling || cooling.until <= state.elapsed) return null;
  return { remaining: cooling.until - state.elapsed, total: cooling.total };
}

/** The game accepts no actions while an event is open or after it has ended. */
const isHalted = (state) => state.event !== null || state.ended !== null;

/**
 * Visible actions, grouped in display order.
 * @returns {ActionView[]}
 */
export function listActions(state) {
  const halted = isHalted(state);
  const visible = ACTION_DEFS.filter((def) => meets(state, def.when));

  return ACTION_GROUPS.flatMap((group) =>
    visible
      .filter((def) => def.group === group.id)
      .map((def) => {
        const reason = blockOf(state, def);
        const cooldown = cooldownOf(state, def);
        return {
          id: def.id,
          label: def.label,
          group: group.id,
          groupLabel: group.label,
          hint: def.hint,
          cost: Object.entries(def.cost ?? {}).map(([id, count]) => ({
            id,
            label: RESOURCE_BY_ID[id].label,
            amount: count,
            have: amount(state, id),
          })),
          enabled: !halted && reason === null && cooldown === null,
          reason,
          cooldown,
        };
      }),
  );
}

/**
 * @param {import('./journal.js').Sim} sim
 * @param {string} id
 * @returns {boolean} whether the action was carried out
 */
export function perform(sim, id) {
  const { state } = sim;
  const def = ACTION_BY_ID[id];
  const possible =
    def && !isHalted(state) && meets(state, def.when) && blockOf(state, def) === null && cooldownOf(state, def) === null;
  if (!possible) {
    sfx(sim, 'deny');
    return false;
  }

  pay(state, def.cost);
  state.counts[id] = (state.counts[id] ?? 0) + 1;
  if (def.cooldown) state.cooldowns[id] = { until: state.elapsed + def.cooldown, total: def.cooldown };
  applyEffects(sim, def.effects);

  // Once, early on: tasks recover side by side, so there is no need to wait on one.
  const done = Object.values(state.counts).reduce((sum, count) => sum + count, 0);
  if (done >= PARALLEL_TIP_AFTER && !state.flags['tip:parallel'] && !state.event) {
    state.flags['tip:parallel'] = true;
    log(sim, PARALLEL_TIP, 'good');
  }
  return true;
}
