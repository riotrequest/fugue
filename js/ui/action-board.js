import { WAITING_REASONS } from '../sim/content/actions.js';

/**
 * What the action panel shows, worked out from the sim's action list alone.
 * Pure and DOM-free, so it runs under Node; js/ui/actions.js turns it into
 * buttons. Nothing here decides what an action costs or whether it can be done:
 * the sim's ActionView already says, and this only sorts and labels.
 *
 * @typedef {import('../sim/systems/actions.js').ActionView} ActionView
 *
 * @typedef {'ready'|'cooling'|'short'|'waiting'|'blocked'|'halted'} ActionState
 *   ready    can be done now
 *   cooling  resting after the last time
 *   short    not enough of something it costs, or a tool it needs
 *   waiting  only time will lift it (dark until dawn, too late to set out)
 *   blocked  some other reason (not hungry, fire too low)
 *   halted   nothing is wrong with it, but the game is not taking actions (an event is open)
 */

/** The survival basics, kept in a strip above the tabs. Shown only once the sim lists them. */
export const QUICK_IDS = ['wake', 'relight', 'stoke', 'gather-wood', 'fetch-water', 'eat', 'drink'];

/** Cooldowns at least this long count down on the button; shorter ones just show the fill. */
export const COUNTDOWN_FROM = 20;

/** Below this many actions everything fits in one list, so there are no tabs or strip yet. */
export const TABS_FROM = 7;

/** A tab with more actions than this sorts the ones that cannot be done below a fold. */
export const CROWDED_FROM = 7;

/** The fold starts closed when it would hold more than this many, and something is still open above it. */
export const FOLD_CLOSED_ABOVE = 6;

const WAITING = new Set(WAITING_REASONS);

/** 45 -> "45s", 90 -> "1:30". */
export function formatWait(seconds) {
  const whole = Math.ceil(seconds);
  if (whole < 60) return `${whole}s`;
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

/** 'the fire' -> 'fire': tabs want one word, the sim's labels read as phrases. */
export const tabLabel = (groupLabel) => String(groupLabel).replace(/^the\s+/i, '');

/** @param {ActionView} action */
export const isShort = (action) => (action.cost ?? []).some((entry) => entry.have < entry.amount);

/** A missing tool is reported as "needs a …"; it reads as a shortfall, not a rule. */
const lacksTool = (reason) => /^needs an? /.test(reason ?? '');

/** @param {ActionView} action @returns {ActionState} */
export function stateOf(action) {
  if (action.enabled) return 'ready';
  const { reason, cooldown } = action;
  if (reason && WAITING.has(reason)) return 'waiting';
  if (isShort(action) || lacksTool(reason)) return 'short';
  if (reason) return 'blocked';
  if (cooldown) return 'cooling';
  return 'halted';
}

/**
 * The short line under a greyed button, so nobody has to hover to learn why.
 * A shortfall in materials is left out: the cost already turns red and says how far.
 * @param {ActionView} action
 */
export function noteOf(action) {
  if (action.enabled) return '';
  const state = stateOf(action);
  if (state === 'short') return /^not enough /.test(action.reason ?? '') ? '' : (action.reason ?? '');
  if (state === 'waiting' || state === 'blocked') return action.reason;
  const { cooldown } = action;
  if (state === 'cooling' && cooldown.total >= COUNTDOWN_FROM) return `ready in ${formatWait(cooldown.remaining)}`;
  return '';
}

/**
 * How that note is coloured: a missing tool in red, a wait in amber, any other
 * reason quiet, even when the cost is short as well.
 * @param {ActionView} action
 * @returns {''|'warn'|'danger'}
 */
export function noteToneOf(action) {
  if (action.enabled) return '';
  const state = stateOf(action);
  if (state === 'waiting' || state === 'cooling') return 'warn';
  return lacksTool(action.reason) ? 'danger' : '';
}

/**
 * The fuller line in the hint area under the panel: what it does, then why not.
 * @param {ActionView} action
 */
export function detailOf(action) {
  const state = stateOf(action);
  if (state === 'cooling') return `ready in ${formatWait(action.cooldown.remaining)}`;
  if (state === 'ready' || state === 'halted') return '';
  return action.reason ?? '';
}

/**
 * Tabs, in the sim's display order, each with its actions. Whatever groups the
 * sim lists become tabs, so new groups need no change here.
 * @param {ActionView[]} actions
 * @returns {{ id: string, label: string, actions: ActionView[] }[]}
 */
export function categoriesOf(actions) {
  const byGroup = new Map();
  for (const action of actions) {
    if (!byGroup.has(action.group)) {
      byGroup.set(action.group, { id: action.group, label: tabLabel(action.groupLabel ?? action.group), actions: [] });
    }
    byGroup.get(action.group).actions.push(action);
  }
  return [...byGroup.values()];
}

/**
 * How the panel is laid out: one flat list while there is little to do, then a
 * tab per group. Once tabs have appeared they stay, so the panel never flips back
 * when a finished building drops off the list.
 * @param {ActionView[]} actions
 * @param {boolean} wasTabbed
 * @returns {{ tabbed: boolean, categories: { id: string, label: string, actions: ActionView[] }[] }}
 */
export function layoutOf(actions, wasTabbed = false) {
  const tabbed = wasTabbed || actions.length >= TABS_FROM;
  if (tabbed) return { tabbed, categories: categoriesOf(actions) };
  return { tabbed, categories: actions.length ? [{ id: 'all', label: 'all', actions }] : [] };
}

/**
 * The quick strip: the same ActionView objects as the tabs, so both read one
 * source and can never disagree.
 * @param {ActionView[]} actions
 */
export function quickActions(actions) {
  const byId = new Map(actions.map((action) => [action.id, action]));
  return QUICK_IDS.map((id) => byId.get(id)).filter(Boolean);
}

/**
 * Splits a tab into what can be done (or soon will be: cooling actions stay put)
 * and what cannot yet. Small tabs are left in their natural order so nothing
 * jumps around while you use them.
 * @param {ActionView[]} actions
 * @returns {{ open: ActionView[], locked: ActionView[] }}
 */
export function splitBoard(actions) {
  if (actions.length < CROWDED_FROM) return { open: actions, locked: [] };
  const open = [];
  const locked = [];
  for (const action of actions) {
    const state = stateOf(action);
    (state === 'ready' || state === 'cooling' || state === 'halted' ? open : locked).push(action);
  }
  return { open, locked };
}

/**
 * Whether the fold starts closed. A tab with nothing open shows what it holds,
 * so there is always something to work toward in view.
 */
export const foldStartsClosed = (lockedCount, openCount) => openCount > 0 && lockedCount > FOLD_CLOSED_ABOVE;
