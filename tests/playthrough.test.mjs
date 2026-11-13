import { test } from 'node:test';
import assert from 'node:assert/strict';
import { playthrough } from './helpers/bot.mjs';

/**
 * Whole games, played by the bot in simulated time. These are the balance
 * contract: what a sensible player should be able to do, and how long it takes.
 */

const DEATHS = ['frozen', 'starved', 'taken'];
const SEEDS = [1, 2, 3, 4, 5, 6];
const minutes = (seconds) => seconds / 60;

/** Plays a game and records when its landmarks were reached, in real minutes. */
function chronicle(options) {
  const marks = { chapters: {} };
  const result = playthrough({
    ...options,
    onTick(game, seconds) {
      const { chapter } = game.status();
      marks.chapters[chapter] ??= minutes(seconds);
      if (marks.secondAction === undefined && game.actions().length > 1) marks.secondAction = seconds;
      if (marks.firstSurvivor === undefined && game.people()) marks.firstSurvivor = minutes(seconds);
      marks.mostPeople = Math.max(marks.mostPeople ?? 0, game.people()?.total ?? 0);
    },
  });
  return { ...result, marks, ending: result.game.status().ended };
}

test('a player who does nothing dies', () => {
  for (const seed of SEEDS) {
    const { ending, seconds } = chronicle({ seed, style: 'idle' });
    assert.ok(ending, 'the game ends');
    assert.ok(DEATHS.includes(ending.id), `seed ${seed} ended with ${ending.id}`);
    assert.ok(minutes(seconds) < 15, 'and it does not take long');
  }
});

test('a player who settles in can bring their people through to the thaw', () => {
  for (const seed of SEEDS) {
    const { ending, seconds, marks, game } = chronicle({ seed, style: 'settler' });
    assert.equal(ending?.id, 'thaw', `seed ${seed} ended with ${ending?.id}`);
    assert.ok(minutes(seconds) >= 45 && minutes(seconds) <= 90, `seed ${seed} took ${minutes(seconds)} minutes`);
    assert.ok(marks.mostPeople >= 4, 'the camp grows');
    assert.ok(game.people().total >= 1, 'and someone is left to see the spring');
  }
});

test('the opening is paced: something new within half a minute, a stranger within minutes', () => {
  for (const seed of SEEDS) {
    const { marks } = chronicle({ seed, style: 'settler', minutes: 30 });
    assert.ok(marks.secondAction <= 30, `first unlock at ${marks.secondAction}s`);
    assert.ok(marks.firstSurvivor >= 4 && marks.firstSurvivor <= 7, `first survivor at minute ${marks.firstSurvivor}`);
    assert.ok(marks.chapters['III · Countersubject'] <= 12, 'the second voice follows');
    assert.ok(marks.chapters['IV · Stretto'] >= 15, 'winter holds off long enough to prepare');
  }
});

test('a player who goes looking recovers the past and can raise the mast', () => {
  const endings = new Set();
  for (const seed of SEEDS) {
    const { ending, seconds, game } = chronicle({ seed, style: 'seeker' });
    assert.ok(ending && !DEATHS.includes(ending.id), `seed ${seed} ended with ${ending?.id}`);
    assert.ok(minutes(seconds) >= 30 && minutes(seconds) <= 90, `seed ${seed} took ${minutes(seconds)} minutes`);
    assert.ok(game.memories().filter((memory) => memory.found).length >= 6, 'most of the story is found');
    assert.ok(game.view().structures.length >= 8);
    if (ending.id === 'beacon') assert.equal(game.view().beacon, true);
    endings.add(ending.id);
  }
  assert.ok(endings.has('beacon'), 'the beacon ending is reachable');
});

test('a player may also simply walk away', () => {
  const { ending } = chronicle({ seed: 2, style: 'walker' });
  assert.equal(ending.id, 'walk');
  assert.equal(ending.title, 'Tacet');
});
