import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../js/sim/index.js';
import { playthrough } from './helpers/bot.mjs';

/** Difficulty settings, and the people who turn out not to be what they seemed. */

const lostIn = (game) =>
  game.state.log.filter((line) => /does not wake|dies in the night|gone by morning|walked out|without a word|into the trees|so is|taking/.test(line.text)).length;

test('a new game is normal unless told otherwise, and the choice holds only until play begins', () => {
  assert.equal(createGame({ seed: 1 }).status().difficulty, 'normal');
  assert.equal(createGame({ seed: 1, difficulty: 'hard' }).status().difficulty, 'hard');
  assert.equal(createGame({ seed: 1, difficulty: 'nonsense' }).status().difficulty, 'normal');

  const game = createGame({ seed: 1 });
  assert.equal(game.setDifficulty('easy'), true);
  assert.equal(game.status().difficulty, 'easy');
  assert.equal(game.setDifficulty('sideways'), false);
  game.perform(game.actions()[0].id);
  game.tick(1);
  assert.equal(game.setDifficulty('hard'), false, 'too late once the fire is touched');
  assert.equal(game.status().difficulty, 'easy');
});

test('saves from before difficulty and traits still load, and play as normal', () => {
  const { game } = playthrough({ seed: 4, minutes: 12 });
  const old = game.serialize();
  delete old.difficulty;
  delete old.ledger;
  delete old.timers.theft;
  for (const person of old.people) {
    for (const key of ['trait', 'since', 'noticed', 'thefts']) delete person[key];
  }
  const restored = createGame({ save: old, seed: 99 });
  assert.equal(restored.status().day, game.status().day, 'the old game, not a fresh one');
  assert.equal(restored.status().difficulty, 'normal');
  for (let i = 0; i < 600; i++) restored.tick(1);
  assert.ok(restored.people().total >= 0);
});

test('hard is harder on the camp than easy', () => {
  let easy = 0;
  let hard = 0;
  for (const seed of [1, 2, 3]) {
    easy += lostIn(playthrough({ seed, difficulty: 'easy' }).game);
    hard += lostIn(playthrough({ seed, difficulty: 'hard' }).game);
  }
  assert.ok(hard > easy, `lost ${hard} on hard and ${easy} on easy`);
});

test('a thief at the fire is caught sooner or later, and can be driven out', () => {
  const game = createGame({ seed: 7 });
  game.perform(game.actions()[0].id);
  const { state } = game;
  state.flags.met = true;
  state.people.push({ id: 99, name: 'Wren', seed: 5, role: null, health: 1, sick: false, trait: 'thief', since: 0, noticed: false, thefts: 0 });
  state.resources.rations = 20;
  state.known.push('rations');

  let caught = null;
  for (let i = 0; i < 4000 && !caught; i++) {
    state.player.vitals.food = 1;
    state.player.vitals.water = 1;
    state.player.vitals.warmth = 1;
    state.fire.fuel = 6;
    state.resources.rations = 20;
    // Fed and watered, so hunger never makes them too sick to steal.
    state.resources.water = 8;
    if (game.event() && game.event().id !== 'caught-stealing') game.choose(game.event().choices.find((c) => c.enabled).id);
    if (game.event()?.id === 'caught-stealing') caught = game.event();
    else game.tick(1);
  }
  assert.ok(caught, 'the thief was caught');
  assert.match(caught.text, /Wren/);
  assert.ok(!/\{\w+\}/.test(caught.text), 'what they took is named');
  assert.equal(game.choose('exile'), true);
  assert.equal(state.people.some((person) => person.id === 99), false, 'and is gone');
});
