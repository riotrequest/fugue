/**
 * Turns the game's loosely-typed SceneView into the strict, clamped Scene the
 * sound beds consume. Every defensive check lives here so the beds can stay
 * simple.
 */

import { smoothstep, unit } from './util.js';

/**
 * The view the game passes to `update()`. Every field is optional.
 * @typedef {Object} SceneView
 * @property {number} [time]             0..1, 0 = midnight, 0.5 = noon
 * @property {number} [fire]             0 dead .. 1 roaring
 * @property {'clear'|'rain'|'snow'|'fog'|'ash'} [weather]
 * @property {number} [weatherIntensity] 0..1
 * @property {number} [wind]             0..1
 * @property {number} [cold]             0..1 depth of winter
 * @property {unknown[]} [people]        survivors at the fire
 * @property {number} [threat]           0..1 danger in the tree line
 * @property {boolean} [beacon]          a radio mast is broadcasting
 * @property {string|null} [ended]       set once the story is over
 */

/**
 * @typedef {Object} Scene
 * @property {number} night     0 at midday .. 1 in deep night
 * @property {number} fire      0..1
 * @property {number} rain      0..1 rainfall
 * @property {number} hush      0..1 snow or fog deadening the air
 * @property {number} ash       0..1 ashfall
 * @property {number} wind      0..1
 * @property {number} cold      0..1
 * @property {number} quiet     multiplier (<= 1) applied to the wider world
 * @property {number} people    survivors at the fire
 * @property {number} threat    0..1
 * @property {boolean} beacon
 * @property {boolean} ended
 */

const NOON = 0.5;
/** Darkness (0 noon .. 1 midnight) at which night begins and is complete. */
const NIGHT_BEGINS = 0.4;
const NIGHT_COMPLETE = 0.8;
/** Used when a weather is named without an intensity. */
const DEFAULT_WEATHER_INTENSITY = 0.5;
/** How much deep winter and snow/fog each quieten the wider world. */
const COLD_QUIETING = 0.35;
const HUSH_QUIETING = 0.3;

/**
 * @param {SceneView|null|undefined} view
 * @returns {Scene}
 */
export function readScene(view) {
  const source = view ?? {};
  const darkness = 0.5 + 0.5 * Math.cos(2 * Math.PI * unit(source.time, NOON));
  const intensity = unit(source.weatherIntensity, DEFAULT_WEATHER_INTENSITY);
  const weather = source.weather;
  const hush = weather === 'snow' || weather === 'fog' ? intensity : 0;
  const cold = unit(source.cold, 0);

  return {
    night: smoothstep(NIGHT_BEGINS, NIGHT_COMPLETE, darkness),
    fire: unit(source.fire, 0),
    rain: weather === 'rain' ? intensity : 0,
    hush,
    ash: weather === 'ash' ? intensity : 0,
    wind: unit(source.wind, 0),
    cold,
    quiet: (1 - COLD_QUIETING * cold) * (1 - HUSH_QUIETING * hush),
    people: Array.isArray(source.people) ? source.people.length : 0,
    threat: unit(source.threat, 0),
    beacon: source.beacon === true,
    ended: Boolean(source.ended),
  };
}
