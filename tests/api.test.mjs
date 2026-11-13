import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SAVE_VERSION, createGame } from '../js/sim/index.js';
import { playthrough } from './helpers/bot.mjs';

const TONES = ['normal', 'good', 'warn', 'danger', 'memory', 'voice'];
const SFX = [
  'stoke', 'ignite', 'chop', 'gather', 'build', 'craft', 'eat', 'drink',
  'arrive', 'danger', 'memory', 'death', 'deny', 'dawn', 'dusk', 'unlock',
];
const STRUCTURES = [
  'leanto', 'rack', 'raincatcher', 'shed', 'snares', 'workbench', 'garden',
  'cabin', 'palisade', 'smokehouse', 'watchtower', 'radio',
];
const ACTION_GROUPS = ['fire', 'forage', 'make', 'build', 'venture', 'self'];

const isFraction = (value) => typeof value === 'number' && value >= 0 && value <= 1;
const keysOf = (object) => Object.keys(object).sort();

function assertStatus(status) {
  assert.deepEqual(
    keysOf(status),
    ['chapter', 'clock', 'day', 'difficulty', 'ended', 'fireLabel', 'phase', 'season', 'time', 'weather', 'weatherLabel'],
  );
  assert.ok(Number.isInteger(status.day) && status.day >= 1);
  assert.ok(status.time >= 0 && status.time < 1);
  assert.ok(['dawn', 'day', 'dusk', 'night'].includes(status.phase));
  assert.equal(status.clock, `Day ${status.day} · ${status.phase}`);
  assert.ok(['clear', 'rain', 'snow', 'fog', 'ash'].includes(status.weather));
  assert.match(status.chapter, /^\w+$/);
  assert.match(status.fireLabel, /^the fire is /);
  if (status.ended) assert.deepEqual(keysOf(status.ended), ['canContinue', 'id', 'text', 'title']);
}

function assertVitals(vitals) {
  assert.equal(vitals[0].id, 'fire');
  for (const vital of vitals) {
    assert.deepEqual(keysOf(vital), ['id', 'label', 'note', 'tone', 'value']);
    assert.ok(isFraction(vital.value), `${vital.id} = ${vital.value}`);
    assert.ok(['ok', 'warn', 'danger'].includes(vital.tone));
    assert.ok(vital.note.length > 0 && !vital.note.includes(' '));
  }
}

function assertResources(resources) {
  for (const resource of resources) {
    assert.deepEqual(keysOf(resource), ['amount', 'cap', 'group', 'groupLabel', 'id', 'label', 'source']);
    assert.ok(Number.isInteger(resource.amount) && resource.amount >= 0, `${resource.id} = ${resource.amount}`);
    assert.ok(resource.cap === null || resource.amount <= resource.cap, `${resource.id} over cap`);
  }
}

function assertActions(actions) {
  const groupOrder = actions.map((action) => ACTION_GROUPS.indexOf(action.group));
  assert.deepEqual(groupOrder, groupOrder.slice().sort((a, b) => a - b), 'actions are grouped in display order');
  for (const action of actions) {
    assert.deepEqual(
      keysOf(action),
      ['cooldown', 'cost', 'enabled', 'group', 'groupLabel', 'hint', 'id', 'label', 'reason'],
    );
    assert.ok(ACTION_GROUPS.includes(action.group));
    assert.equal(typeof action.enabled, 'boolean');
    assert.ok(action.reason === null || typeof action.reason === 'string');
    assert.ok(typeof action.hint === 'string' && action.hint.length > 0);
    for (const item of action.cost) assert.deepEqual(keysOf(item), ['amount', 'have', 'id', 'label']);
    if (action.cooldown) {
      assert.ok(action.cooldown.remaining > 0 && action.cooldown.remaining <= action.cooldown.total);
      assert.equal(action.enabled, false);
    }
    if (action.reason) assert.equal(action.enabled, false);
  }
}

function assertPeople(people) {
  if (people === null) return;
  assert.deepEqual(keysOf(people), ['cap', 'idle', 'names', 'roles', 'sick', 'total']);
  assert.equal(people.names.length, people.total);
  const working = people.roles.reduce((sum, role) => sum + role.count, 0);
  assert.equal(working + people.idle + people.sick, people.total);
  for (const role of people.roles) {
    assert.deepEqual(keysOf(role), ['count', 'hint', 'id', 'label', 'max', 'tool']);
    assert.ok(role.max === null || role.count <= role.max);
  }
}

function assertEvent(event) {
  if (event === null) return;
  assert.deepEqual(keysOf(event), ['choices', 'id', 'text', 'title', 'tone']);
  assert.ok(TONES.includes(event.tone));
  assert.ok(event.title.length > 0 && event.text.length > 0);
  assert.ok(!/\{\w+\}/.test(event.title + event.text), `unfilled placeholder in ${event.id}`);
  assert.ok(event.choices.some((choice) => choice.enabled), `${event.id} has no way out`);
  for (const choice of event.choices) {
    assert.deepEqual(keysOf(choice), ['enabled', 'hint', 'id', 'label', 'reason']);
    assert.equal(choice.enabled, choice.reason === null);
  }
}

function assertScene(view) {
  assert.deepEqual(keysOf(view), [
    'beacon', 'cold', 'day', 'ended', 'fire', 'people', 'player', 'structures',
    'threat', 'time', 'weather', 'weatherIntensity', 'wind', 'wood',
  ]);
  for (const key of ['fire', 'weatherIntensity', 'wind', 'cold', 'wood', 'threat']) {
    assert.ok(isFraction(view[key]), `${key} = ${view[key]}`);
  }
  assert.ok(['asleep', 'sitting', 'tending', 'away'].includes(view.player));
  assert.equal(typeof view.beacon, 'boolean');
  for (const id of view.structures) assert.ok(STRUCTURES.includes(id), id);
  for (const person of view.people) {
    assert.deepEqual(keysOf(person), ['id', 'pose', 'seed']);
    assert.ok(Number.isInteger(person.seed));
    assert.ok(['sitting', 'sleeping', 'standing', 'working', 'away'].includes(person.pose));
  }
}

function assertAllViews(game) {
  assertStatus(game.status());
  assertVitals(game.vitals());
  assertResources(game.resources());
  assertActions(game.actions());
  assertPeople(game.people());
  assertEvent(game.event());
  assertScene(game.view());
}

test('exports a save version and a game with the whole contract', () => {
  assert.ok(Number.isInteger(SAVE_VERSION));
  const game = createGame({ seed: 1 });
  for (const method of [
    'tick', 'on', 'serialize', 'log', 'status', 'vitals', 'resources', 'actions', 'perform',
    'people', 'assign', 'event', 'choose', 'memories', 'view', 'setDifficulty',
  ]) {
    assert.equal(typeof game[method], 'function', method);
  }
  assert.equal(typeof game.state, 'object');
});

test('a new game opens asleep beside embers with a single action', () => {
  const game = createGame({ seed: 1 });
  const view = game.view();
  assert.equal(view.player, 'asleep');
  assert.equal(view.day, 1);
  assert.ok(view.fire > 0.05 && view.fire < 0.25, 'the fire is embers');
  assert.equal(game.status().chapter, 'Subject');
  assert.equal(game.status().ended, null);
  assert.equal(game.people(), null);
  assert.equal(game.event(), null);
  assert.equal(game.actions().length, 1);
  assert.ok(game.log().length > 0, 'the log is not empty on first load');
  assertAllViews(game);
});

test('the first action wakes the player and discovery follows quickly', () => {
  const game = createGame({ seed: 1 });
  const sounds = [];
  game.on('sfx', ({ name }) => sounds.push(name));

  assert.equal(game.perform(game.actions()[0].id), true);
  assert.ok(sounds.includes('stoke'));
  game.tick(0.1);
  assert.notEqual(game.view().player, 'asleep');
  assert.ok(game.actions().length >= 2, 'something new to do within moments of waking');
  assert.ok(sounds.includes('unlock'));
});

test('memories are listed in story order, hidden until found', () => {
  const memories = createGame({ seed: 1 }).memories();
  assert.ok(memories.length >= 10 && memories.length <= 12);
  for (const memory of memories) {
    assert.deepEqual(keysOf(memory), ['found', 'id', 'text', 'title']);
    assert.equal(memory.found, false);
    assert.ok(memory.text.length > 0);
  }
});

test('an impossible action is refused with a deny sound and changes nothing', () => {
  const game = createGame({ seed: 1 });
  const sounds = [];
  game.on('sfx', ({ name }) => sounds.push(name));
  const before = JSON.stringify(game.serialize());

  assert.equal(game.perform('build-cabin'), false);
  assert.equal(game.perform('no-such-action'), false);
  assert.equal(game.choose('anything'), false);
  assert.equal(game.assign('woodcutter', 1), false);
  assert.deepEqual(sounds, ['deny', 'deny']);
  assert.equal(JSON.stringify(game.serialize()), before);
});

test('on() delivers events and its return value unsubscribes', () => {
  const game = createGame({ seed: 1 });
  const lines = [];
  const off = game.on('log', (entry) => lines.push(entry));
  game.perform('wake');
  assert.ok(lines.length > 0);
  assert.deepEqual(keysOf(lines[0]), ['day', 'text', 'tone']);

  const heard = lines.length;
  off();
  game.perform('stoke');
  assert.equal(lines.length, heard);
});

test('every read model keeps its shape through a whole game, and only known signals are emitted', () => {
  const tones = new Set();
  const sounds = new Set();
  const opened = [];
  let ended = null;
  let hooked = false;

  const { game } = playthrough({
    seed: 11,
    style: 'seeker',
    onTick(running, seconds) {
      if (!hooked) {
        hooked = true;
        running.on('log', ({ tone }) => tones.add(tone));
        running.on('sfx', ({ name }) => sounds.add(name));
        running.on('event', ({ id }) => opened.push(id));
        running.on('eventClosed', ({ id }) => assert.equal(id, opened[opened.length - 1]));
        running.on('ended', (payload) => (ended = payload));
      }
      if (seconds % 5 === 0 || running.event()) assertAllViews(running);
    },
  });

  for (const tone of tones) assert.ok(TONES.includes(tone), `tone ${tone}`);
  for (const name of sounds) assert.ok(SFX.includes(name), `sfx ${name}`);
  assert.ok(opened.length > 20, 'a full game is made of many events');
  assert.ok(game.log().length <= 200);
  assert.deepEqual(ended, game.status().ended);
  assert.equal(game.view().ended, ended.id);
  assert.ok(game.memories().some((memory) => memory.found));
});
