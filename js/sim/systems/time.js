import { SEASON, TIME, YEAR } from '../tuning.js';
import { clamp01, lerp } from '../util.js';
import { PHASE_LINES } from '../content/lines.js';
import { log, sfx, vary } from './journal.js';

/**
 * The clock and the season. Cold is a pure function of the date: it climbs from
 * late autumn to deep winter and stays there until the thaw. For anyone still at
 * the fire, the year then turns: spring, summer, autumn, and winter again.
 *
 * @typedef {'dawn'|'day'|'dusk'|'night'} Phase
 */

const YEAR_DAYS = YEAR.seasons.reduce((sum, season) => sum + season.days, 0);
const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];

/** Days since the first thaw (fractional), or null before it. */
function sinceThaw(state) {
  if (!state.flags['done:thaw']) return null;
  return Math.max(0, state.clock.day - 1 + state.clock.time - (SEASON.thawDay - 1));
}

/**
 * Where the turning year stands after the first thaw.
 * @returns {{ id: string, cycle: number, t: number, left: number }|null}
 *   season id, how many full years have passed since the thaw, progress through
 *   the season (0..1) and whole days left in it; null during the first winter
 */
export function yearPhaseOf(state) {
  const days = sinceThaw(state);
  if (days === null) return null;
  const cycle = Math.floor(days / YEAR_DAYS);
  let into = days - cycle * YEAR_DAYS;
  for (const season of YEAR.seasons) {
    if (into < season.days) return { id: season.id, cycle, t: into / season.days, left: Math.ceil(season.days - into) };
    into -= season.days;
  }
  const last = YEAR.seasons.at(-1);
  return { id: last.id, cycle, t: 1, left: 0 };
}

/** 'first-winter' until the thaw, then 'spring' | 'summer' | 'autumn' | 'winter'. */
export const seasonIdOf = (state) => yearPhaseOf(state)?.id ?? 'first-winter';

/** Winters lived through: 1 in the first, 2 from the thaw until the next thaw, and so on. */
export const yearOf = (state) => {
  const phase = yearPhaseOf(state);
  return phase ? phase.cycle + 2 : 1;
};

/** Cold in a season of the turning year. */
function seasonCold(phase) {
  const season = YEAR.seasons.find((entry) => entry.id === phase.id);
  const [from, to] = season.cold;
  if (season.peak !== undefined) {
    // Winter climbs to its peak at midwinter and eases toward the thaw.
    return phase.t < 0.5 ? lerp(from, season.peak, phase.t * 2) : lerp(season.peak, to, (phase.t - 0.5) * 2);
  }
  if (phase.id === 'spring') {
    // The snow goes quickly: cold eases from the end of winter, quickest at first.
    const winterEnd = phase.cycle === 0 ? 1 : YEAR.seasons.at(-1).cold[1];
    const ease = Math.min(1, (phase.t * season.days) / SEASON.springDays);
    const settled = lerp(from, to, phase.t);
    return lerp(winterEnd, settled, 1 - (1 - ease) ** 2);
  }
  return lerp(from, to, phase.t);
}

/** @returns {number} 0..1 */
export function coldOf(state) {
  const phase = yearPhaseOf(state);
  if (phase) return clamp01(seasonCold(phase));
  const daysIn = state.clock.day - 1 + state.clock.time;
  return clamp01(lerp(SEASON.startCold, 1, daysIn / (SEASON.deepWinterDay - 1)));
}

/**
 * Where the year stands, for the top bar: late autumn, winter, deep winter
 * with a count of days to the thaw ("deep winter, thaw in 3 days"), then the
 * seasons of the years that follow ("summer", "the second winter", "autumn, year 3").
 */
export function seasonOf(state) {
  const phase = yearPhaseOf(state);
  if (!phase) {
    const { day } = state.clock;
    if (day >= SEASON.deepWinterDay) {
      const left = SEASON.thawDay - day;
      return left > 1 ? `deep winter, thaw in ${left} days` : 'deep winter, thaw at dawn';
    }
    return coldOf(state) >= SEASON.strettoCold ? 'winter' : 'late autumn';
  }
  const year = phase.cycle + 2;
  if (phase.id === 'winter') {
    const deep = coldOf(state) >= 0.8 ? 'deep winter' : `the ${ORDINALS[year - 1] ?? `${year}th`} winter`;
    if (phase.left <= 4) return `${deep}, thaw ${phase.left > 1 ? `in ${phase.left} days` : 'at dawn'}`;
    return deep;
  }
  return phase.cycle === 0 ? phase.id : `${phase.id}, year ${year}`;
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
