import { TRADE } from '../tuning.js';
import { RESOURCE_BY_ID } from '../content/resources.js';
import { TRADER_AGAIN, TRADER_BARE, TRADER_PITCHES } from '../content/trader.js';
import { amount, capOf } from './camp.js';
import { dialOf } from './difficulty.js';
import { log, vary } from './journal.js';
import { openEvent } from './modal.js';
import { phaseOf } from './time.js';

/**
 * The travelling trader. Every few days, by daylight, someone comes by with a
 * few deals laid out on a tarp: anything from the stores, food or salvage, more
 * often the hard-to-find things, each for something the camp has plenty of.
 * The deals are made when the trader arrives and travel with the event as plain
 * choice objects, so a save mid-visit restores them exactly.
 *
 * @typedef {import('./journal.js').Sim} Sim
 */

const GOODS = Object.keys(TRADE.worth);
const labelOf = (id) => RESOURCE_BY_ID[id].label;

/** How much more of something fits in the stores. */
function room(state, id) {
  const cap = capOf(state, id);
  return cap === null ? Infinity : cap - amount(state, id);
}

/** How freely the camp could part with something: full stores first. */
function plenty(state, id) {
  const cap = capOf(state, id);
  const have = amount(state, id);
  return 0.05 + (cap === null ? Math.min(1, have / 10) : have / cap);
}

/**
 * One deal: `count` of `give` from the trader, for `price` of something the camp
 * holds. Null when nothing the camp has would pay for it.
 */
function makeDeal(sim, give, markup) {
  const { state } = sim;
  const asks = GOODS.filter((id) => id !== give && amount(state, id) > 0);
  if (asks.length === 0) return null;
  const ask = sim.rng.weighted(asks, (id) => plenty(state, id));

  const worthGive = TRADE.worth[give];
  const worthAsk = TRADE.worth[ask];
  const target = sim.rng.range(...TRADE.bundle);
  // The price, in what the trader asks for, must buy at least one of what they give.
  const least = Math.ceil((worthGive * markup) / worthAsk);
  const budget = Math.min(amount(state, ask), Math.max(least, Math.round(target / worthAsk)));
  const count = Math.min(room(state, give), Math.floor((budget * worthAsk) / (worthGive * markup)));
  if (budget < least || count < 1) return null;
  // Charged for what is actually handed over, which room in the stores may have cut short.
  const price = Math.ceil((count * worthGive * markup) / worthAsk);

  const id = `deal-${give}`;
  return {
    id,
    label: `${count} ${labelOf(give)} for ${price} ${labelOf(ask)}`,
    cost: { [ask]: price },
    effects: [
      { grant: { [give]: count } },
      { sfx: 'craft' },
      { log: `You hand over ${price} ${labelOf(ask)} and take ${count} ${labelOf(give)}.`, tone: 'good' },
      { trader: id },
    ],
  };
}

/** A visit's worth of deals, each for something different. @param {Sim} sim */
export function dealsFor(sim) {
  const { state } = sim;
  const markup = TRADE.markup / Math.sqrt(dialOf(state).yields);
  const deals = [];
  let open = GOODS.filter((id) => room(state, id) >= 1);
  for (let tries = 0; deals.length < TRADE.offers && open.length > 0 && tries < TRADE.offers * 4; tries++) {
    const give = sim.rng.weighted(open, (id) => Math.sqrt(TRADE.worth[id]));
    open = open.filter((id) => id !== give);
    const deal = makeDeal(sim, give, markup);
    if (deal) deals.push(deal);
  }
  return deals;
}

/** After a deal: the trader lingers while there is more to trade. @param {Sim} sim */
export function afterDeal(sim, dealId, offers = []) {
  const rest = offers.filter((offer) => offer.id !== dealId);
  if (rest.length > 0) openEvent(sim, 'trader', { offers: rest, pitch: vary(sim, TRADER_AGAIN) });
  else log(sim, vary(sim, TRADER_BARE));
}

/** Brings the trader by, in daylight, once the camp is more than a fire. @param {Sim} sim */
export function stepTrader(sim) {
  const { state } = sim;
  // Saves from before the trader existed get their first visit on schedule.
  state.timers.trader ??= TRADE.firstAt;
  if (state.elapsed < state.timers.trader || state.chapter < TRADE.chapter || phaseOf(state) !== 'day') return;

  state.timers.trader = state.elapsed + sim.rng.range(...TRADE.gap);
  const offers = dealsFor(sim);
  if (offers.length > 0) openEvent(sim, 'trader', { offers, pitch: vary(sim, TRADER_PITCHES) });
}
