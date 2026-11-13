import { SEASON, WEATHER } from '../tuning.js';
import { lerp } from '../util.js';
import { WEATHERS, WEATHER_BY_ID } from '../content/weather.js';
import { accrue, add, isBuilt } from './camp.js';
import { meets } from './conditions.js';
import { log, vary } from './journal.js';
import { coldOf, isAway } from './time.js';
import { dialOf } from './difficulty.js';

/** Weather comes in spells: each lasts a while, then the sky is rolled again. */

/** @returns {import('../content/weather.js').WeatherDef} */
export const weatherOf = (state) => WEATHER_BY_ID[state.weather.id];

/** How much the woods have to give right now, 0..1: less in the cold, less under snow or ash. */
export const abundanceOf = (state) =>
  (1 - SEASON.scarcity * coldOf(state)) * weatherOf(state).forage * dialOf(state).yields;

/** Starts a new spell of the given weather. */
export function setWeather(sim, id) {
  const { state, rng } = sim;
  state.weather = {
    id,
    intensity: id === 'clear' ? 0 : rng.range(...WEATHER.intensity),
    wind: rng.range(...WEATHER.wind),
    until: state.elapsed + rng.range(...WEATHER.spellSeconds),
  };
  if (!state.player.awake || isAway(state)) return;
  const def = WEATHER_BY_ID[id];
  log(sim, vary(sim, def.lines));
  // The first time, say plainly what this weather does.
  if (def.tip && !state.flags[`tip:${id}`]) {
    state.flags[`tip:${id}`] = true;
    log(sim, def.tip, 'warn');
  }
}

export function stepWeather(sim, dt) {
  const { state, rng } = sim;

  if (state.elapsed >= state.weather.until) {
    const cold = coldOf(state);
    const options = WEATHERS.filter((def) => def.id !== state.weather.id && meets(state, def.when));
    setWeather(sim, rng.weighted(options, (def) => lerp(def.weight[0], def.weight[1], cold)).id);
  }

  const { fill } = weatherOf(state);
  if (fill > 0 && isBuilt(state, 'raincatcher')) {
    add(state, 'water', accrue(state, 'raincatcher', fill * state.weather.intensity * dt));
  }
}
