import test from 'node:test';
import assert from 'node:assert/strict';

import { createGame } from '../js/sim/index.js';
import { TRADE } from '../js/sim/tuning.js';

/** A camp at midday on day 3, well stocked, with nothing else about to happen. */
function campAwaitingTrader(seed) {
  const game = createGame({ seed });
  const { state } = game;
  state.player.awake = true;
  state.chapter = 2;
  state.elapsed = TRADE.firstAt;
  state.clock = { day: 3, time: 0.5 };
  Object.assign(state.timers, { arrival: 1e9, incident: 1e9, ambient: 1e9, voice: 1e9, theft: 1e9, trader: TRADE.firstAt });
  Object.assign(state.resources, { wood: 30, stone: 15, fiber: 15, water: 8, forage: 12, rations: 10, scrap: 6 });
  return game;
}

const until = (game, done, seconds = 30) => {
  for (let t = 0; t < seconds && !done(); t += 0.1) game.tick(0.1);
  return done();
};

test('a trader comes by day with a few deals, and stays while there is more to trade', () => {
  let traded = 0;
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    const game = campAwaitingTrader(seed);
    assert.ok(until(game, () => game.event()?.id === 'trader'), `seed ${seed}: no trader came`);

    const event = game.event();
    const deals = event.choices.filter((choice) => choice.id.startsWith('deal-'));
    assert.ok(deals.length >= 1 && deals.length <= TRADE.offers, `seed ${seed}: ${deals.length} deals`);
    assert.ok(event.choices.some((choice) => choice.id === 'part' && choice.enabled), 'the trader can always be sent on');
    assert.ok(!event.text.includes('{'), 'the pitch is filled in');

    const deal = deals.find((choice) => choice.enabled);
    if (!deal) continue;
    const count = Number(deal.label.match(/^(\d+) /)[1]);
    const give = deal.id.slice('deal-'.length);
    const before = game.state.resources[give] ?? 0;
    assert.equal(game.choose(deal.id), true);
    assert.equal(game.state.resources[give], before + count, `seed ${seed}: got ${give}`);
    traded++;

    const next = game.event();
    if (deals.length > 1) {
      assert.equal(next?.id, 'trader', 'the trader waits while deals are left');
      assert.ok(!next.choices.some((choice) => choice.id === deal.id), 'a deal is made only once');
      assert.equal(game.choose('part'), true);
    }
    assert.equal(game.event(), null);
  }
  assert.ok(traded >= 4, 'most visits have something the camp can afford');
});

test('no trader at night, or before the camp is more than a fire', () => {
  const night = campAwaitingTrader(1);
  night.state.clock.time = 0.95;
  assert.equal(until(night, () => night.event() !== null, 5), false);

  const early = campAwaitingTrader(1);
  early.state.chapter = 1;
  assert.equal(until(early, () => early.event() !== null, 5), false);
});

test('a save made mid-visit keeps the same deals', () => {
  const game = campAwaitingTrader(3);
  until(game, () => game.event()?.id === 'trader');
  const restored = createGame({ save: JSON.parse(JSON.stringify(game.serialize())) });
  assert.deepEqual(restored.event(), game.event());
});
