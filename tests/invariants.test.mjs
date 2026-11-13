import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../js/sim/index.js';
import { createBot, playthrough } from './helpers/bot.mjs';

/** Fails on any NaN, infinity or undefined anywhere in a JSON-like value. */
function assertSound(value, path = 'state') {
  if (typeof value === 'number') assert.ok(Number.isFinite(value), `${path} = ${value}`);
  else if (value === undefined) assert.fail(`${path} is undefined`);
  else if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) assertSound(child, `${path}.${key}`);
  }
}

function assertBounds(game) {
  const { state } = game;
  assertSound(state);

  for (const [id, value] of Object.entries(state.player.vitals)) {
    assert.ok(value >= 0 && value <= 1, `vital ${id} = ${value}`);
  }
  assert.ok(state.fire.fuel >= 0, `fuel = ${state.fire.fuel}`);
  assert.ok(state.threat >= 0 && state.threat <= 1, `threat = ${state.threat}`);
  assert.ok(state.clock.time >= 0 && state.clock.time < 1);
  for (const person of state.people) {
    assert.ok(person.health > 0 && person.health <= 1, `${person.name} health = ${person.health}`);
  }
  for (const resource of game.resources()) {
    assert.ok(Number.isInteger(resource.amount) && resource.amount >= 0, `${resource.id} = ${resource.amount}`);
    if (resource.cap !== null) assert.ok(resource.amount <= resource.cap, `${resource.id} over cap`);
  }
  for (const vital of game.vitals()) assert.ok(vital.value >= 0 && vital.value <= 1);
}

for (const style of ['settler', 'seeker', 'idle']) {
  test(`numbers stay finite and in bounds through a ${style} game`, () => {
    for (const seed of [21, 22]) {
      playthrough({ seed, style, onTick: (game, seconds) => seconds % 2 === 0 && assertBounds(game) });
    }
  });
}

test('paying a cost never drives a store negative, and unaffordable actions are refused', () => {
  const game = createGame({ seed: 4 });
  game.perform('wake');
  for (let i = 0; i < 400; i++) {
    for (const { id } of game.actions()) {
      // Re-read each time: the action before this one may have spent what it needs.
      const action = game.actions().find((candidate) => candidate.id === id);
      if (!action) continue;
      const affordable = action.cost.every((item) => item.have >= item.amount);
      const done = game.perform(action.id);
      if (!affordable) assert.equal(done, false, `${action.id} went through without its cost`);
      if (done) {
        for (const item of action.cost) {
          const now = game.resources().find((resource) => resource.id === item.id)?.amount ?? 0;
          assert.ok(now >= 0);
        }
      }
    }
    game.tick(1);
    if (game.event()) game.choose(game.event().choices.find((choice) => choice.enabled).id);
    assertBounds(game);
  }
});

test('long frames are clamped and nonsense time steps are ignored', () => {
  const game = createGame({ seed: 1 });
  const elapsed = () => game.state.elapsed;

  game.tick(30);
  assert.equal(elapsed(), 1);
  for (const dt of [0, -5, NaN, undefined]) game.tick(dt);
  assert.equal(elapsed(), 1);
  assertBounds(game);
});

test('time stands still while an event is open, and moves again once it is resolved', () => {
  const game = createGame({ seed: 6 });
  const bot = createBot(game, 'settler');
  while (!game.event()) {
    bot.act();
    game.tick(1);
  }

  const frozen = JSON.stringify(game.serialize());
  for (let i = 0; i < 50; i++) game.tick(1);
  assert.equal(JSON.stringify(game.serialize()), frozen);
  assert.ok(game.actions().every((action) => !action.enabled), 'no actions while an event is open');
  assert.equal(game.perform('gather-wood'), false);

  while (game.event()) game.choose(game.event().choices.find((choice) => choice.enabled).id);
  const before = game.state.elapsed;
  game.tick(1);
  assert.equal(game.state.elapsed, before + 1);
});

test('nothing moves after the game has ended', () => {
  const { game } = playthrough({ seed: 8, style: 'idle' });
  assert.ok(game.status().ended);

  const final = JSON.stringify(game.serialize());
  game.tick(1);
  assert.equal(game.perform('stoke'), false);
  assert.equal(game.choose('anything'), false);
  assert.equal(JSON.stringify(game.serialize()), final);

  const reloaded = createGame({ save: game.serialize() });
  assert.deepEqual(reloaded.status().ended, game.status().ended);
});

test('survivors who are not fed or watered sicken and are lost', () => {
  const settled = createGame({ seed: 12 });
  const bot = createBot(settled, 'settler');
  while ((settled.people()?.total ?? 0) < 3 || settled.event()) {
    bot.act();
    settled.tick(1);
  }

  // The same camp, with everyone idle and the stores emptied of food and water.
  const save = settled.serialize();
  Object.assign(save.resources, { rations: 0, forage: 0, meat: 0, water: 0 });
  Object.assign(save.player.vitals, { food: 1, water: 1, health: 1 });
  for (const person of save.people) person.role = null;
  const game = createGame({ save });

  const tones = new Set();
  game.on('log', ({ tone }) => tones.add(tone));
  let fewest = game.people().total;
  let sick = 0;
  for (let i = 0; i < 400 && !game.status().ended; i++) {
    if (game.event()) game.choose(game.event().choices.at(-1).id);
    else if (game.view().fire < 0.5) game.perform('stoke');
    game.tick(1);
    fewest = Math.min(fewest, game.people().total);
    sick = Math.max(sick, game.people().sick);
  }
  assert.ok(sick > 0, 'hunger and thirst make people too weak to work');
  assert.ok(fewest < 3, 'and then it kills them, or they leave');
  assert.ok(tones.has('warn') && tones.has('danger'));
});
