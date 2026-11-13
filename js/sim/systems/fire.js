import { FIRE } from '../tuning.js';
import { clamp01, fill } from '../util.js';
import { FIRE_FADING_LINES, KEEPER_RELIGHT_LINES } from '../content/lines.js';
import { WEATHER_BY_ID } from '../content/weather.js';
import { amount, bonus, canAfford, pay } from './camp.js';
import { log, vary } from './journal.js';
import { coldOf, isAway } from './time.js';
import { dialOf } from './difficulty.js';

/**
 * The fire. Fuel is counted in pieces of wood and burns down continuously; a
 * bigger fire burns faster, wind fans it, cold wood burns poorly, and rain and
 * snow eat at it unless there is shelter. Intensity is fuel relative to a full fire.
 */

const BAND_ORDER = ['dead', ...FIRE.bands.map(([id]) => id)];
const RELIGHT_COST = { tinder: 1, wood: 1 };
const RELIGHT_FUEL = 1.5;

/** @returns {number} 0 dead, ~0.15 embers, ~0.5 burning, 1 roaring */
export const intensityOf = (state) => (state.fire.lit ? clamp01(state.fire.fuel / FIRE.fullFuel) : 0);

/** @returns {'dead'|'embers'|'low'|'burning'|'roaring'} */
export function bandOf(state) {
  if (!state.fire.lit) return 'dead';
  const intensity = intensityOf(state);
  return FIRE.bands.find(([, below]) => intensity < below)[0];
}

/** Share of rain and snow that reaches the fire, after any roof over it. */
export const exposureOf = (state) => 1 - Math.min(FIRE.maxShelter, bonus(state, 'shelter'));

/** Adds wood to the fire, lighting it if it was out. */
export function feed(state, wood) {
  const { fire } = state;
  fire.lit = true;
  fire.fuel = Math.min(FIRE.maxFuel, fire.fuel + wood);
  fire.band = bandOf(state);
}

export function stepFire(sim, dt) {
  const { state } = sim;
  const { fire, weather } = state;
  if (!fire.lit) return;

  const dial = dialOf(state);
  const draw =
    FIRE.burn *
    dial.burn *
    (FIRE.idleDraw + intensityOf(state)) *
    (1 + FIRE.windDraw * weather.wind) *
    (1 + FIRE.coldDraw * coldOf(state));
  const douse = WEATHER_BY_ID[weather.id].douse * weather.intensity * exposureOf(state) * dial.weather;

  fire.fuel = Math.max(0, fire.fuel - (draw + douse) * dt);
  if (fire.fuel === 0) fire.lit = false;

  const band = bandOf(state);
  if (band === fire.band) return;
  const sinking = BAND_ORDER.indexOf(band) < BAND_ORDER.indexOf(fire.band);
  fire.band = band;
  if (sinking && FIRE_FADING_LINES[band] && state.player.awake && !isAway(state)) {
    log(sim, vary(sim, FIRE_FADING_LINES[band]), band === 'dead' ? 'danger' : 'warn');
  }
}

/**
 * One turn of a fire keeper's work: add a piece of wood if the fire is below the
 * level the season calls for, or relight it if it has gone out.
 * @param {import('./journal.js').Sim} sim
 * @param {import('../state.js').Person} keeper
 */
export function tend(sim, keeper) {
  const { state } = sim;
  if (!state.fire.lit) {
    if (!canAfford(state, RELIGHT_COST)) return;
    pay(state, RELIGHT_COST);
    feed(state, RELIGHT_FUEL);
    log(sim, fill(vary(sim, KEEPER_RELIGHT_LINES), keeper), 'good');
    return;
  }
  const wanted = FIRE.fullFuel * (FIRE.tendFloor + FIRE.tendWinter * coldOf(state));
  if (state.fire.fuel < wanted && amount(state, 'wood') >= 1) {
    pay(state, { wood: 1 });
    feed(state, 1);
  }
}
