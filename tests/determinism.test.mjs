import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SAVE_VERSION, createGame } from '../js/sim/index.js';
import { REACTION, createBot, playthrough } from './helpers/bot.mjs';

const STEP = 0.25;
const TICKS_PER_MOVE = REACTION / STEP;

/** Drives a game with a bot for a number of ticks, starting from a given tick count. */
function run(game, fromTick, toTick, style = 'seeker') {
  const bot = createBot(game, style);
  for (let tick = fromTick; tick < toTick && !game.status().ended; tick++) {
    if (tick % TICKS_PER_MOVE === 0) bot.act();
    game.tick(STEP);
  }
}

test('the same seed and the same inputs give the same game', () => {
  const first = playthrough({ seed: 42, style: 'seeker', minutes: 25 }).game;
  const second = playthrough({ seed: 42, style: 'seeker', minutes: 25 }).game;
  assert.deepEqual(first.serialize(), second.serialize());
});

test('different seeds give different games', () => {
  const first = playthrough({ seed: 1, minutes: 12 }).game;
  const second = playthrough({ seed: 2, minutes: 12 }).game;
  assert.notDeepEqual(first.serialize(), second.serialize());
});

test('a save is plain JSON and carries its version', () => {
  const { game } = playthrough({ seed: 5, minutes: 10 });
  const save = game.serialize();
  assert.equal(save.version, SAVE_VERSION);
  assert.deepEqual(JSON.parse(JSON.stringify(save)), save);
  assert.notEqual(save, game.state, 'serialize returns a copy');
});

test('restoring a save and playing on matches the uninterrupted game', () => {
  const total = 60 * 40 / STEP;
  const uninterrupted = createGame({ seed: 7 });
  run(uninterrupted, 0, total);

  for (const minutes of [3, 9, 17, 26]) {
    const savedAt = (60 * minutes) / STEP;
    const original = createGame({ seed: 7 });
    run(original, 0, savedAt);

    const restored = createGame({ save: JSON.parse(JSON.stringify(original.serialize())) });
    assert.deepEqual(restored.serialize(), original.serialize());
    assert.deepEqual(restored.log(), original.log());

    run(restored, savedAt, total);
    assert.deepEqual(restored.serialize(), uninterrupted.serialize(), `saved at minute ${minutes}`);
  }
});

test('a save taken while an event is open restores the event and its cooldowns', () => {
  const game = createGame({ seed: 3 });
  const bot = createBot(game, 'settler');
  for (let tick = 0; !game.event(); tick++) {
    if (tick % TICKS_PER_MOVE === 0) bot.act();
    game.tick(STEP);
  }
  game.perform('gather-wood');

  const restored = createGame({ save: game.serialize() });
  assert.deepEqual(restored.event(), game.event());
  assert.deepEqual(restored.actions(), game.actions());

  const choice = game.event().choices.find((option) => option.enabled).id;
  assert.equal(game.choose(choice), true);
  assert.equal(restored.choose(choice), true);
  assert.deepEqual(restored.serialize(), game.serialize());
});

test('unusable saves are ignored and a fresh game starts', () => {
  const good = playthrough({ seed: 9, minutes: 3 }).game.serialize();
  const { rng, ...missingKey } = good;
  const bad = [
    undefined,
    null,
    'not a save',
    42,
    [],
    {},
    { ...good, version: SAVE_VERSION + 1 },
    { ...good, version: SAVE_VERSION - 1 },
    { ...good, people: 'nobody' },
    { ...good, clock: null },
    missingKey,
  ];
  for (const save of bad) {
    const game = createGame({ save, seed: 1 });
    assert.equal(game.view().player, 'asleep');
    assert.equal(game.status().day, 1);
    assert.deepEqual(game.serialize(), createGame({ seed: 1 }).serialize());
  }
});
