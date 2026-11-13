import { DIRECTOR } from '../tuning.js';
import { CHAINS, CHAIN_BY_ID } from '../content/chains.js';
import { EVENT_BY_ID } from '../content/events.js';
import { fill } from '../util.js';
import { meets } from './conditions.js';
import { log } from './journal.js';
import { castable, openEvent } from './modal.js';
import { chronicle } from './history.js';

/**
 * Stories told over several days: smoke on a far ridge, then a trail, then
 * whoever made it. Each chain is a handful of ordinary events (content/chains.js)
 * that schedule one another with the `chain` effect and close with `chainEnd`.
 * Between stages the chain waits in the save:
 *
 *   state.chains[id] = { stage: 'event-id' | null, at: seconds, ctx: cast, since: seconds, steps: n }
 *
 * `stage` null means an event of the chain is open (or the chain is finished,
 * when `done` is set). Chains never open over another event, and a stage whose
 * person has gone ends the chain with its `lost` line.
 *
 * @typedef {import('./journal.js').Sim} Sim
 */

const entryOf = (state, id) => (state.chains ??= {})[id];

/** Chains begun and not yet over. */
export const liveChains = (state) => Object.values(state.chains ?? {}).filter((entry) => !entry.done).length;

/** Schedules the next stage of a chain. Called by the `chain` effect. */
export function scheduleChain(sim, { id, stage, wait = [120, 240] }, ctx) {
  const { state, rng } = sim;
  const entry = entryOf(state, id) ?? (state.chains[id] = { since: state.elapsed });
  entry.stage = stage;
  entry.steps = (entry.steps ?? 0) + 1;
  entry.at = state.elapsed + rng.range(...wait);
  entry.ctx = ctx;
}

/** Ends a chain, whatever stage it reached. Called by the `chainEnd` effect. */
export function endChain(sim, id, ctx = {}) {
  const { state } = sim;
  const entry = entryOf(state, id) ?? (state.chains[id] = { since: state.elapsed });
  entry.done = true;
  entry.stage = null;
  entry.ended = state.elapsed;
  const def = CHAIN_BY_ID[id];
  // A personal story, once told, stays theirs: they will not be handed another.
  if (def?.arc) {
    entry.arc = true;
    const person = state.people.find((candidate) => candidate.id === (ctx.person ?? entry.ctx?.person));
    if (person) person.arc = `done:${id}`;
  }
  // Only a story that went somewhere is worth remembering: one turned down at once is not.
  if (def?.record && entry.steps) chronicle(state, fill(def.record, { ...entry.ctx, ...ctx }));
}

/** Whether the people a stage is about are still here. */
function present(state, ctx = {}) {
  const here = (id) => id === undefined || state.people.some((person) => person.id === id);
  return here(ctx.person) && here(ctx.otherId);
}

/**
 * Opens the next stage of whichever chain is due, if any.
 * @returns {boolean} whether an event opened
 */
export function stepChains(sim) {
  const { state } = sim;
  for (const [id, entry] of Object.entries(state.chains ?? {})) {
    if (entry.done || !entry.stage || state.elapsed < entry.at) continue;
    if (!present(state, entry.ctx)) {
      const def = CHAIN_BY_ID[id];
      if (def?.lost) log(sim, fill(def.lost, entry.ctx), 'warn');
      endChain(sim, id, entry.ctx);
      continue;
    }
    const event = EVENT_BY_ID[entry.stage];
    if (!meets(state, event.when)) {
      const def = CHAIN_BY_ID[id];
      entry.waiting ??= state.elapsed;
      // Some stories wait on the player (an errand out in the ruins); left too long, they lapse.
      if (def?.patience && state.elapsed - entry.waiting > def.patience) {
        if (def.lapsed) log(sim, fill(def.lapsed, entry.ctx), 'warn');
        const person = state.people.find((candidate) => candidate.id === entry.ctx?.person);
        if (person) person.trust = Math.max(0, (person.trust ?? 0.5) - 0.1);
        endChain(sim, id, entry.ctx);
        continue;
      }
      entry.at = state.elapsed + 30;
      continue;
    }
    delete entry.waiting;
    const stage = entry.stage;
    entry.stage = null;
    openEvent(sim, stage, { ...entry.ctx, chain: id });
    return true;
  }
  return false;
}

/** The chains that could begin now. */
export function startableChains(state) {
  return CHAINS.filter((def) => !state.chains?.[def.id] && meets(state, def.when) && castable(state, def));
}

/**
 * Begins a new chain, if one may begin.
 * @returns {boolean} whether an event opened
 */
export function startChain(sim) {
  const { state, rng } = sim;
  if (state.elapsed < (state.timers.chain ?? DIRECTOR.firstChain)) return false;
  if (liveChains(state) >= DIRECTOR.chainsLive) return false;
  const options = startableChains(state);
  if (options.length === 0) return false;
  const def = rng.weighted(options, (option) => option.weight ?? 1);
  state.timers.chain = state.elapsed + DIRECTOR.chainGap;
  state.chains[def.id] = { since: state.elapsed, stage: null, at: state.elapsed, ctx: {} };
  // The opening event's own `cast` matches the chain's, so openEvent chooses who it is about.
  openEvent(sim, def.start, { chain: def.id });
  const { ctx } = state.event;
  state.chains[def.id].ctx = { ...ctx };
  if (def.arc) {
    const person = state.people.find((candidate) => candidate.id === ctx.person);
    if (person) person.arc = def.id;
  }
  return true;
}

/** The story note for a survivor's card: what their own story is doing now. */
export function arcNoteOf(state, person) {
  if (!person.arc) return null;
  const done = person.arc.startsWith('done:');
  const def = CHAIN_BY_ID[done ? person.arc.slice(5) : person.arc];
  if (!def) return null;
  const note = done ? def.doneNote : def.note;
  return note ? fill(note, { name: person.name }) : null;
}
