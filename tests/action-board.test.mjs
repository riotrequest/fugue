import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createGame } from '../js/sim/index.js';
import { ACTION_GROUPS, WAITING_REASONS } from '../js/sim/content/actions.js';
import {
  COUNTDOWN_FROM, CROWDED_FROM, QUICK_IDS, TABS_FROM,
  categoriesOf, detailOf, foldStartsClosed, formatWait, layoutOf, noteOf, noteToneOf, quickActions, splitBoard,
  stateOf, tabLabel,
} from '../js/ui/action-board.js';
import { playthrough } from './helpers/bot.mjs';

/** A hand-made ActionView, for the cases a real game reaches only by luck. */
const view = (overrides = {}) => ({
  id: 'thing',
  label: 'do a thing',
  group: 'make',
  groupLabel: 'make',
  hint: 'a hint',
  cost: [],
  enabled: true,
  reason: null,
  cooldown: null,
  ...overrides,
});

const ids = (actions) => actions.map((action) => action.id);

/** Every rule the panel's sorting must keep, checked against one action list. */
function assertBoardInvariants(actions) {
  const { tabbed, categories } = layoutOf(actions);
  assert.equal(tabbed, actions.length >= TABS_FROM);

  // Tabs cover every action exactly once, in the sim's own order.
  const tabsOf = categoriesOf(actions);
  assert.deepEqual(tabsOf.flatMap((category) => ids(category.actions)), ids(actions));
  const order = tabsOf.map((category) => ACTION_GROUPS.findIndex((group) => group.id === category.id));
  assert.deepEqual(order, order.slice().sort((a, b) => a - b), 'tabs follow the group order');
  if (!tabbed) assert.deepEqual(categories.flatMap((category) => ids(category.actions)), ids(actions));

  // The strip shows the very same view objects as the tabs, in its own order.
  const quick = quickActions(actions);
  assert.deepEqual(ids(quick), QUICK_IDS.filter((id) => actions.some((action) => action.id === id)));
  for (const action of quick) assert.ok(actions.includes(action), `${action.id} is the tab's own view`);

  for (const category of tabsOf) {
    const { open, locked } = splitBoard(category.actions);
    assert.deepEqual([...ids(open), ...ids(locked)].sort(), ids(category.actions).sort(), 'nothing lost or doubled');
    // Each side keeps the sim's order.
    for (const side of [open, locked]) {
      const at = side.map((action) => category.actions.indexOf(action));
      assert.deepEqual(at, at.slice().sort((a, b) => a - b));
    }
    if (category.actions.length < CROWDED_FROM) assert.equal(locked.length, 0, 'small tabs are not split');
    else for (const action of open) assert.equal(action.reason, null, `${action.id} is open with a reason`);
  }

  for (const action of actions) {
    const state = stateOf(action);
    assert.equal(state === 'ready', action.enabled, `${action.id}: ${state}`);
    if (action.enabled) {
      assert.equal(noteOf(action), '');
      assert.equal(detailOf(action), '');
    }
    if (state === 'waiting') assert.ok(WAITING_REASONS.includes(action.reason));
    if (state === 'cooling') assert.ok(action.cooldown && !action.reason);
    if (state === 'short') {
      assert.ok(action.cost.some((entry) => entry.have < entry.amount) || /^needs an? /.test(action.reason));
    }
    if (action.reason && state !== 'short') assert.equal(detailOf(action), action.reason);
  }
}

test('a new game shows one action in a plain list: no tabs and no strip yet', () => {
  const game = createGame({ seed: 1 });
  const actions = game.actions();
  const { tabbed, categories } = layoutOf(actions);
  assert.equal(tabbed, false);
  assert.deepEqual(categories.map((category) => ids(category.actions)), [['wake']]);
  assertBoardInvariants(actions);
});

test('the panel sorts every action list of whole games without losing or doubling one', () => {
  for (const style of ['settler', 'seeker']) {
    let checked = 0;
    let sawTabs = false;
    let sawSplit = false;
    playthrough({
      seed: 3,
      style,
      minutes: 60,
      onTick: (game, seconds) => {
        if (seconds % 5 !== 0) return;
        const actions = game.actions();
        assertBoardInvariants(actions);
        sawTabs ||= layoutOf(actions).tabbed;
        sawSplit ||= categoriesOf(actions).some((category) => splitBoard(category.actions).locked.length > 0);
        checked += 1;
      },
    });
    assert.ok(checked > 100, `${style}: checked ${checked} moments`);
    assert.ok(sawTabs, `${style}: the panel grew tabs`);
    if (style === 'seeker') assert.ok(sawSplit, 'a crowded tab was split');
  }
});

test('the strip and the tabs read the same cooldown after an action is used', () => {
  const game = createGame({ seed: 2 });
  game.perform('wake');
  game.tick(0.1);
  assert.equal(game.perform('stoke'), true);
  game.tick(0.1);
  const actions = game.actions();
  const quick = quickActions(actions).find((action) => action.id === 'stoke');
  const inTab = categoriesOf(actions)
    .flatMap((category) => category.actions)
    .find((action) => action.id === 'stoke');
  assert.equal(quick, inTab);
  assert.equal(stateOf(quick), 'cooling');
  assert.match(detailOf(quick), /^ready in \d+s$/);
  assert.equal(noteOf(quick), '', 'short cooldowns show only the fill');
});

test('daylight gates are waits, and only they are', () => {
  assert.deepEqual([...WAITING_REASONS].sort(), ['dark until dawn', 'too late to set out']);
  const night = view({ enabled: false, reason: 'too late to set out', cost: [{ id: 'water', label: 'water', amount: 2, have: 0 }] });
  assert.equal(stateOf(night), 'waiting', 'a wait outranks a shortfall: time will not fix the cost, but it is the first block');
  assert.equal(noteOf(night), 'too late to set out');
  assert.equal(noteToneOf(night), 'warn');
});

test('a shortfall turns the cost red and leaves the note for anything else', () => {
  const cost = [{ id: 'wood', label: 'wood', amount: 40, have: 12 }];
  const short = view({ enabled: false, reason: 'not enough wood: chop it in the woods', cost });
  assert.equal(stateOf(short), 'short');
  assert.equal(noteOf(short), '', 'the cost already says how far there is to go');
  assert.equal(detailOf(short), 'not enough wood: chop it in the woods', 'the hint line says where it comes from');

  const full = view({ enabled: false, reason: 'no room for more rations', cost: [{ id: 'meat', label: 'raw meat', amount: 1, have: 0 }] });
  assert.equal(stateOf(full), 'short');
  assert.equal(noteOf(full), 'no room for more rations');
  assert.equal(noteToneOf(full), '', 'a full store is not a lack');

  const tool = view({ enabled: false, reason: 'needs a pot' });
  assert.equal(stateOf(tool), 'short');
  assert.equal(noteOf(tool), 'needs a pot');
  assert.equal(noteToneOf(tool), 'danger');

  const sated = view({ enabled: false, reason: 'not hungry' });
  assert.equal(stateOf(sated), 'blocked');
  assert.equal(noteOf(sated), 'not hungry');
  assert.equal(noteToneOf(sated), '');
});

test('long cooldowns count down on the button; an open event only halts', () => {
  const resting = view({ enabled: false, cooldown: { remaining: 83.2, total: 120 } });
  assert.equal(stateOf(resting), 'cooling');
  assert.equal(noteOf(resting), 'ready in 1:24');
  assert.equal(noteToneOf(resting), 'warn');
  assert.equal(noteOf(view({ enabled: false, cooldown: { remaining: 1, total: COUNTDOWN_FROM - 1 } })), '');

  const halted = view({ enabled: false });
  assert.equal(stateOf(halted), 'halted');
  assert.equal(noteOf(halted), '');
  const crowd = Array.from({ length: CROWDED_FROM }, (_, i) => view({ id: `a${i}`, enabled: false }));
  assert.equal(splitBoard(crowd).locked.length, 0, 'an event does not shuffle the board');
});

test('tabs once shown stay, and the fold opens unless it would bury what can be done', () => {
  const few = [view({ id: 'a', group: 'fire', groupLabel: 'the fire' }), view({ id: 'b', group: 'forage', groupLabel: 'the woods' })];
  assert.equal(layoutOf(few).tabbed, false);
  assert.equal(layoutOf(few, true).tabbed, true);
  assert.deepEqual(layoutOf(few, true).categories.map((category) => category.label), ['fire', 'woods']);

  assert.equal(foldStartsClosed(8, 0), false, 'nothing open: show what there is to work toward');
  assert.equal(foldStartsClosed(5, 2), false);
  assert.equal(foldStartsClosed(9, 2), true);
});

test('small formatting helpers', () => {
  assert.equal(tabLabel('the woods'), 'woods');
  assert.equal(tabLabel('yourself'), 'yourself');
  assert.equal(formatWait(45), '45s');
  assert.equal(formatWait(44.1), '45s');
  assert.equal(formatWait(90), '1:30');
});
