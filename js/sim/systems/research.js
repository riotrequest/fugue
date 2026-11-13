import { RESEARCH } from '../tuning.js';
import { PROJECTS, PROJECT_BY_ID } from '../content/research.js';
import { ROLE_BY_ID } from '../content/roles.js';
import { bonus, canAfford, lacking, pay } from './camp.js';
import { meets } from './conditions.js';
import { chronicle } from './history.js';
import { log, sfx } from './journal.js';
import { paceOf } from './people.js';
import { isAway, phaseOf } from './time.js';

/**
 * The notebook. One project is worked on at a time: by you, whenever you are
 * awake at the fire, and by anyone set to study, by day. A project's materials
 * are spent when work on it first begins; switching to another keeps the
 * progress made. Finished projects become holdings (systems/camp.js), so their
 * bonuses add up with the buildings'.
 *
 *   state.research = { active: id | null, progress: { id: work done }, done: [id], paid?: [id] }
 *
 * @typedef {import('./journal.js').Sim} Sim
 *
 * @typedef {object} ProjectView
 * @property {string} id
 * @property {string} title
 * @property {string} text
 * @property {'done'|'active'|'open'|'locked'} status
 * @property {number} progress     0..1
 * @property {{ id: string, amount: number }[]} cost   still to pay before work begins
 * @property {string|null} reason  why it cannot be started, if it cannot
 * @property {string[]} unlocks
 *
 * @typedef {object} NotebookView
 * @property {string|null} active
 * @property {number} pace         units of work a second right now
 * @property {ProjectView[]} projects  those known, in notebook order
 */

const researchOf = (state) => (state.research ??= { active: null, progress: {}, done: [] });

/** Whether the notebook has been found. */
export const hasNotebook = (state) => Boolean(state.flags.notebook);

const isDone = (state, id) => researchOf(state).done.includes(id);
const isPaid = (state, id) => (researchOf(state).paid ?? []).includes(id);
const shown = (state, def) => meets(state, def.when);

/** Why a project cannot be worked on now, or null. */
function blockedBy(state, def) {
  const missing = (def.needs ?? []).filter((id) => !isDone(state, id));
  if (missing.length > 0) return `first: ${missing.map((id) => PROJECT_BY_ID[id].title.toLowerCase()).join(', ')}`;
  if (!isPaid(state, def.id) && def.cost) return lacking(state, def.cost);
  return null;
}

/** How fast the notebook moves right now, in units of work a second. */
export function researchPace(state) {
  const yours = state.player.awake && !isAway(state) ? RESEARCH.base : 0;
  const day = phaseOf(state) !== 'night';
  const scholars = day
    ? state.people.filter((person) => ROLE_BY_ID[person.role]?.studies && !person.sick).reduce((sum, person) => sum + paceOf(person), 0)
    : 0;
  const boost = 1 + bonus(state, 'research') + (state.flags.lessons ? RESEARCH.lessons : 0);
  return (yours + scholars * RESEARCH.perScholar) * boost;
}

/**
 * Sets the notebook to a project, paying for it if work has not begun.
 * @returns {boolean} whether the notebook is now on it
 */
export function study(sim, id) {
  const { state } = sim;
  const def = PROJECT_BY_ID[id];
  if (!def || !hasNotebook(state) || isDone(state, id) || !shown(state, def)) return false;
  if (blockedBy(state, def) !== null) {
    sfx(sim, 'deny');
    return false;
  }
  const research = researchOf(state);
  if (!isPaid(state, id)) {
    if (def.cost) {
      if (!canAfford(state, def.cost)) return false;
      pay(state, def.cost);
    }
    research.paid = [...(research.paid ?? []), id];
  }
  research.active = id;
  return true;
}

/** Progress from a flash of understanding (the `insight` effect), in seconds of work. */
export function insight(state, work) {
  const research = researchOf(state);
  if (!research.active) return;
  research.progress[research.active] = (research.progress[research.active] ?? 0) + work;
}

function finish(sim, def) {
  const { state } = sim;
  const research = researchOf(state);
  research.done.push(def.id);
  research.active = null;
  for (const flag of def.flags ?? []) state.flags[flag] = true;
  log(sim, `The notebook: ${def.done}`, 'good');
  chronicle(state, `Worked out: ${def.title.toLowerCase()}.`);
  sfx(sim, 'unlock');
  sim.emit('research', { id: def.id });
}

/** @param {Sim} sim @param {number} dt */
export function stepResearch(sim, dt) {
  const { state } = sim;
  const research = researchOf(state);
  const def = PROJECT_BY_ID[research.active];
  if (!def) return;
  research.progress[def.id] = (research.progress[def.id] ?? 0) + researchPace(state) * dt;
  if (research.progress[def.id] >= def.work) finish(sim, def);
}

/** @returns {NotebookView|null} */
export function notebookView(state) {
  if (!hasNotebook(state)) return null;
  const research = researchOf(state);
  return {
    active: research.active,
    pace: researchPace(state),
    projects: PROJECTS.filter((def) => isDone(state, def.id) || shown(state, def)).map((def) => {
      const done = isDone(state, def.id);
      const reason = done ? null : blockedBy(state, def);
      const paid = isPaid(state, def.id);
      return {
        id: def.id,
        title: def.title,
        text: def.text,
        status: done ? 'done' : research.active === def.id ? 'active' : reason && (def.needs ?? []).some((id) => !isDone(state, id)) ? 'locked' : 'open',
        progress: done ? 1 : Math.min(1, (research.progress[def.id] ?? 0) / def.work),
        cost: paid || !def.cost ? [] : Object.entries(def.cost).map(([id, count]) => ({ id, amount: count })),
        reason,
        unlocks: def.unlocks ?? [],
      };
    }),
  };
}
