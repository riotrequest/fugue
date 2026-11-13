/**
 * Fugue: the simulation core.
 *
 * Pure game logic and content with no DOM or browser access, so the same code
 * runs in the page and under Node for tests. The state is plain JSON; all
 * randomness comes from a seeded generator whose position is part of that state,
 * so a game is fully determined by its seed and the inputs it is given.
 *
 *   content/   what exists: resources, actions, structures, roles, events, prose
 *   systems/   how it behaves: one module per mechanism, interpreting the content
 *   tuning.js  every balance number
 *   views.js   read models for the UI, renderer and audio
 */

import { createEmitter } from './emitter.js';
import { createRng } from './rng.js';
import { advance, settle } from './simulation.js';
import { SAVE_VERSION, createState, restoreState } from './state.js';
import { TIME } from './tuning.js';
import { isDifficulty } from './systems/difficulty.js';
import { listActions, perform } from './systems/actions.js';
import { choose, describeEvent } from './systems/events.js';
import { assign } from './systems/people.js';
import { continueAfterEnding } from './systems/endings.js';
import * as views from './views.js';

export { SAVE_VERSION };

/**
 * @typedef {import('./state.js').GameState} GameState
 * @typedef {import('./views.js').Status} Status
 * @typedef {import('./views.js').VitalView} VitalView
 * @typedef {import('./views.js').ResourceView} ResourceView
 * @typedef {import('./views.js').PeopleView} PeopleView
 * @typedef {import('./views.js').MemoryView} MemoryView
 * @typedef {import('./views.js').SceneView} SceneView
 * @typedef {import('./systems/actions.js').ActionView} ActionView
 * @typedef {import('./systems/events.js').EventView} EventView
 * @typedef {{ text: string, tone: 'normal'|'good'|'warn'|'danger'|'memory'|'voice', day: number }} LogEntry
 *
 * @typedef {object} Game
 * @property {GameState} state   live state; read-only to callers
 * @property {(dt: number) => void} tick   advance by real seconds (clamped to 1s); no-op while an event is open or after the end
 * @property {(type: 'log'|'event'|'eventClosed'|'sfx'|'ended', fn: (payload: any) => void) => () => void} on   subscribe; returns unsubscribe
 * @property {() => object} serialize      JSON-safe snapshot for `createGame({ save })`
 * @property {() => LogEntry[]} log        the most recent log lines, oldest first
 * @property {() => Status} status
 * @property {() => VitalView[]} vitals
 * @property {() => ResourceView[]} resources
 * @property {() => ActionView[]} actions
 * @property {(actionId: string) => boolean} perform
 * @property {() => PeopleView|null} people
 * @property {(roleId: string, delta: 1|-1) => boolean} assign
 * @property {() => EventView|null} event
 * @property {(choiceId: string) => boolean} choose
 * @property {() => boolean} continueAfterEnding   after an ending that allows it, play on
 * @property {(id: 'easy'|'normal'|'hard') => boolean} setDifficulty   only before the first action
 * @property {() => MemoryView[]} memories
 * @property {() => SceneView} view
 */

/**
 * @param {{ save?: object|null, seed?: number, difficulty?: string }} [opts]
 *   `save` is an object previously returned by `serialize()`; anything else, or a
 *   save from another version, is ignored and a new game begins. `seed` fixes the
 *   random stream of a new game (default: the current time). `difficulty` is
 *   'easy', 'normal' (default) or 'hard', for a new game.
 * @returns {Game}
 */
export function createGame({ save = null, seed = Date.now(), difficulty = 'normal' } = {}) {
  const state = restoreState(save) ?? createState(seed, isDifficulty(difficulty) ? difficulty : 'normal');
  const emitter = createEmitter();
  /** @type {import('./systems/journal.js').Sim} */
  const sim = { state, rng: createRng(state), emit: emitter.emit };

  return {
    state,

    tick(dt) {
      if (state.event || state.ended) return;
      const step = Math.min(dt, TIME.maxStep);
      if (step > 0) advance(sim, step);
    },

    on: emitter.on,
    serialize: () => JSON.parse(JSON.stringify(state)),
    log: () => state.log.map((entry) => ({ ...entry })),

    status: () => views.status(state),
    vitals: () => views.vitals(state),
    resources: () => views.resources(state),
    people: () => views.people(state),
    memories: () => views.memories(state),

    /** Chooses the difficulty of a game that has not begun yet. */
    setDifficulty(id) {
      if (!isDifficulty(id) || state.player.awake || state.elapsed > 0) return false;
      state.difficulty = id;
      return true;
    },
    view: () => views.scene(state),

    actions: () => listActions(state),
    perform: (actionId) => perform(sim, actionId),
    assign: (roleId, delta) => assign(sim, roleId, delta),

    event: () => describeEvent(state),
    /** After an ending that allows it, carry on playing from where the camp stood. */
    continueAfterEnding: () => continueAfterEnding(sim),
    choose(choiceId) {
      const chosen = choose(sim, choiceId);
      // Coming home from an expedition takes camp time, which passes here in one go.
      if (chosen) settle(sim);
      return chosen;
    },
  };
}
