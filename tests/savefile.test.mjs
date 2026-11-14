import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../js/sim/index.js';
import { decodeSaveFile, encodeSaveFile, saveFileName } from '../js/savefile.js';

/** A game some way in, so the save holds more than the opening. */
function playedGame() {
  const game = createGame({ seed: 42, difficulty: 'hard' });
  for (let i = 0; i < 600; i++) game.tick(0.1);
  return game;
}

test('a save file round-trips into the same game', () => {
  const game = playedGame();
  const save = game.serialize();
  const back = decodeSaveFile(encodeSaveFile(save));
  assert.deepEqual(back, save);

  // And it plays on exactly as the original does.
  const original = createGame({ save });
  const loaded = createGame({ save: back });
  for (let i = 0; i < 300; i++) {
    original.tick(0.1);
    loaded.tick(0.1);
  }
  assert.deepEqual(loaded.serialize(), original.serialize());
});

test('the file is labelled JSON with the save inside', () => {
  const save = playedGame().serialize();
  const data = JSON.parse(encodeSaveFile(save, new Date('2026-11-14T12:00:00Z')));
  assert.equal(data.format, 'fugue-save');
  assert.equal(data.exported, '2026-11-14T12:00:00.000Z');
  assert.deepEqual(data.save, save);
});

test('a bare save, as copied out of localStorage, is accepted', () => {
  const save = playedGame().serialize();
  assert.deepEqual(decodeSaveFile(JSON.stringify(save)), save);
  assert.deepEqual(decodeSaveFile(`﻿${JSON.stringify(save)}`), save);
});

test('anything else is refused', () => {
  const save = playedGame().serialize();
  const wrapped = (inner) => JSON.stringify({ format: 'fugue-save', save: inner });
  for (const text of [
    '',
    'not json',
    'null',
    '[]',
    '{}',
    JSON.stringify({ format: 'some-other-game', save: { hello: 1 } }),
    wrapped(null),
    wrapped({ ...save, version: save.version + 1 }),
    wrapped({ ...save, people: 'nobody' }),
    wrapped({ ...save, clock: undefined }),
  ]) {
    assert.equal(decodeSaveFile(text), null, text.slice(0, 60));
  }
  assert.equal(decodeSaveFile(undefined), null);
});

test('the file name says the day and the date', () => {
  const save = createGame({ seed: 1 }).serialize();
  save.clock.day = 12;
  assert.equal(saveFileName(save, new Date(2026, 10, 4)), 'fugue-day-12-2026-11-04.json');
  assert.equal(saveFileName({}, new Date(2026, 0, 1)), 'fugue-day-1-2026-01-01.json');
});
