import { indexById } from '../util.js';

/**
 * @typedef {object} WeatherDef
 * @property {string} id
 * @property {string} label
 * @property {[number, number]} weight  likelihood at cold 0 and at cold 1
 * @property {object} [when]    condition for this weather to be possible at all
 * @property {number} douse     fuel lost per second from an unsheltered fire, at full intensity
 * @property {number} chill     comfort lost at full intensity
 * @property {number} forage    multiplier on what the woods give
 * @property {number} dread     multiplier on the night's threat
 * @property {number} fill      water per second into a rain catcher, at full intensity
 * @property {string[]} lines   log lines when it sets in
 * @property {string} [onFire]  said under the scene while it is eating at an open fire
 * @property {string} [onBody]  the warmth bar's note while it chills you
 * @property {string} [tip]     said the first time it comes, so the player knows what it does
 */

/** @type {WeatherDef[]} */
export const WEATHERS = [
  {
    id: 'clear',
    label: 'clear',
    weight: [5, 4],
    douse: 0,
    chill: 0,
    forage: 1,
    dread: 1,
    fill: 0,
    lines: [
      'The sky clears.',
      'The air goes still and hard.',
      'The cloud breaks up and drifts off east.',
      'It stops. The woods drip, then go quiet.',
    ],
  },
  {
    id: 'rain',
    label: 'rain',
    weight: [3, 0],
    when: { coldMax: 0.8 },
    douse: 0.02,
    chill: 0.15,
    forage: 0.9,
    dread: 1,
    fill: 1 / 14,
    onFire: 'the rain is eating at it',
    onBody: 'soaked',
    tip: 'Rain eats at an open fire and soaks you through. A roof over the fire keeps most of it off.',
    lines: [
      'Rain begins, thin and cold.',
      'Rain comes through the canopy in heavy drops.',
      'It starts to rain. The fire hisses.',
    ],
  },
  {
    id: 'snow',
    label: 'snow',
    weight: [0, 5],
    when: { chapterMin: 4 },
    douse: 0.012,
    chill: 0.18,
    forage: 0.6,
    dread: 1,
    fill: 1 / 40,
    onFire: 'the snow is smothering it',
    onBody: 'snowbound',
    tip: 'Snow smothers the fire and gets into your bones. Keep the woodpile high and the fire covered.',
    lines: [
      'Snow begins to fall.',
      'Snow again, fine as flour.',
      'The air fills with snow.',
    ],
  },
  {
    id: 'fog',
    label: 'fog',
    weight: [1.5, 1],
    douse: 0,
    chill: 0.03,
    forage: 0.9,
    dread: 1.6,
    fill: 0,
    lines: [
      'Fog comes up from the creek.',
      'Fog closes in. The far trees are gone.',
      'A white fog settles between the trunks.',
    ],
  },
  {
    id: 'ash',
    label: 'ashfall',
    weight: [1, 1.2],
    douse: 0,
    chill: 0.02,
    forage: 0.7,
    dread: 1.2,
    fill: 0,
    lines: [
      'Ash begins to fall.',
      'The sky goes yellow-grey. Ash comes down.',
      'Ash again, drifting out of a windless sky.',
    ],
  },
];

export const WEATHER_BY_ID = indexById(WEATHERS);
