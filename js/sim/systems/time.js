import { SEASON, TIME } from '../tuning.js';
import { clamp01, lerp } from '../util.js';
import { PHASE_LINES } from '../content/lines.js';
import { log, sfx, vary } from './journal.js';

/**
 * The clock and the season. Cold is a pure function of the date: it climbs from
 * late autumn to deep winter and stays there until the thaw, then eases into
 * spring for anyone still at the fire.
 *
 * @typedef {'dawn'|'day'|'dusk'|'night'} Phase
 */

/** @returns {number} 0..1 */
export function coldOf(state) {
  const daysIn = state.clock.day - 1 + state.clock.time;
  if (state.flags['done:thaw']) {
    const sinceThaw = Math.max(0, daysIn - (SEASON.thawDay - 1));
    return clamp01(lerp(1, SEASON.springCold, Math.min(1, sinceThaw / SEASON.springDays)));
  }
  return clamp01(lerp(SEASON.startCold, 1, daysIn / (SEASON.deepWinterDay - 1)));
}

/**
 * Where the year stands, for the top bar: late autumn, winter, deep winter
 * with a count of days to the thaw ("deep winter, thaw in 3 days"), then spring.
 */
export function seasonOf(state) {
  if (state.flags['done:thaw']) return 'spring';
  const { day } = state.clock;
  if (day >= SEASON.deepWinterDay) {
    const left = SEASON.thawDay - day;
    return left > 1 ? `deep winter, thaw in ${left} days` : 'deep winter, thaw at dawn';
  }
  return coldOf(state) >= SEASON.strettoCold ? 'winter' : 'late autumn';
}

/** Days shorten as the cold deepens: sunrise comes later and sunset earlier. @returns {Phase} */
export function phaseOf(state) {
  const cold = coldOf(state);
  const sunrise = TIME.sunrise + TIME.sunriseDrift * cold;
  const sunset = TIME.sunset - TIME.sunsetDrift * cold;
  const { time } = state.clock;
  if (time < sunrise - TIME.twilight || time >= sunset + TIME.twilight) return 'night';
  if (time < sunrise + TIME.twilight) return 'dawn';
  if (time < sunset - TIME.twilight) return 'day';
  return 'dusk';
}

/** True while the player is off on an expedition or walking home from one. */
export const isAway = (state) => state.expedition !== null || state.player.awayFor > 0;

const PHASE_SFX = { dawn: 'dawn', dusk: 'dusk' };

/**
 * Advances the clock.
 * @returns {Phase|null} the phase just entered, if it changed
 */
export function stepTime(sim, dt) {
  const { state } = sim;
  const before = phaseOf(state);
  state.clock.time += dt / TIME.daySeconds;
  if (state.clock.time >= 1) {
    state.clock.time -= 1;
    state.clock.day += 1;
  }
  const after = phaseOf(state);
  if (after === before) return null;

  if (PHASE_LINES[after] && state.player.awake && !isAway(state)) log(sim, vary(sim, PHASE_LINES[after]));
  if (PHASE_SFX[after]) sfx(sim, PHASE_SFX[after]);
  return after;
}
