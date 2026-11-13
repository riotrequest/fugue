import { indexById } from '../util.js';

/**
 * What kind of person someone turns out to be. A trait is rolled when they
 * arrive and kept hidden: the camp learns it from what they do. Hard workers
 * and idle hands show themselves within a day or so; a thief only when caught.
 *
 * @typedef {object} TraitDef
 * @property {string} id
 * @property {string} label       shown beside their name once known
 * @property {number} weight      relative chance on arrival
 * @property {boolean} [rogue]    a bad sort: more of them on harder settings
 * @property {number} pace        work speed, 1 = ordinary
 * @property {boolean} [steals]   helps themselves to the stores
 * @property {string[]} [noticed] logged when the camp works out what they are
 * @property {'good'|'warn'} [tone]
 */

/** @type {TraitDef[]} */
export const TRAITS = [
  { id: 'steady', label: '', weight: 52, pace: 1 },
  {
    id: 'diligent',
    label: 'hard worker',
    weight: 20,
    pace: 1.5,
    tone: 'good',
    noticed: [
      '{name} works like two people and never mentions it.',
      'Whatever job {name} is given is done before you think to check.',
      '{name} is up before the light, already working.',
    ],
  },
  {
    id: 'shirker',
    label: 'idle hands',
    weight: 14,
    rogue: true,
    pace: 0.5,
    tone: 'warn',
    noticed: [
      '{name} is never quite where the work is.',
      'You notice {name} warming their hands while the others carry.',
      '{name} eats like everyone else and works like nobody.',
    ],
  },
  { id: 'thief', label: 'thief', weight: 14, rogue: true, pace: 1, steals: true },
];

export const TRAIT_BY_ID = indexById(TRAITS);

/** Logged when food goes missing and no one saw who took it. `{took}` is what went. */
export const THEFT_LINES = [
  'The stores are lighter this morning: {took} gone. Nobody saw anything.',
  'Someone has been at the food. {took}, gone in the night.',
  'You count the stores twice. {took} missing.',
];

/** Logged when a thief walks out of camp for good. */
export const MADE_OFF_LINES = [
  '{name} is gone, and so is {took}.',
  '{name} has walked out, taking {took} along.',
];
