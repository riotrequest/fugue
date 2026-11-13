import { DIRECTOR, SEASON } from '../tuning.js';

/** Chapter titles, named for the parts of a fugue. Index 0 is chapter 1. */
export const CHAPTERS = [
  'I · Subject',
  'II · Answer',
  'III · Countersubject',
  'IV · Stretto',
  'V · Coda',
];

/** Names for people who find the fire. */
export const NAMES = [
  'Ines', 'Tomasz', 'Odalys', 'Bram', 'Keziah', 'Hollis', 'Mireille', 'Dov',
  'Anneke', 'Rufus', 'Saoirse', 'Teodor', 'Lucan', 'Marguerite', 'Josip', 'Willa',
];

/**
 * The spine of the game: each milestone fires once, the first time its condition
 * holds, and applies its effects. Discoveries, chapter turns, story scenes and the
 * thaw all live here, in roughly the order a playthrough meets them.
 *
 * @typedef {object} MilestoneDef
 * @property {string} id
 * @property {object} when      see systems/conditions.js
 * @property {object[]} effects see systems/effects.js
 */

/** @type {MilestoneDef[]} */
export const MILESTONES = [
  {
    id: 'woke',
    when: { awake: true },
    effects: [
      { log: 'You do not know this place. You reach for your name and find only the fire.' },
      { log: 'Beyond the light, the ground is thick with fallen wood.' },
      { sfx: 'unlock' },
    ],
  },
  {
    id: 'water',
    when: { counts: { 'gather-wood': 1 } },
    effects: [
      { flag: 'water' },
      { log: 'Your mouth is dry. Downhill, under the wind, there is the sound of water.' },
      { sfx: 'unlock' },
    ],
  },
  {
    id: 'brambles',
    when: { counts: { 'gather-wood': 3 } },
    effects: [
      { flag: 'forage' },
      { log: 'Brambles at the edge of the light. Something has been eating from them, so you can.' },
      { sfx: 'unlock' },
    ],
  },
  {
    id: 'tinder',
    when: { has: { tinder: 1 } },
    effects: [{ log: 'Dry bark, fine as paper. If the fire ever dies, this will bring it back.' }],
  },
  {
    id: 'stranger',
    when: { elapsedMin: DIRECTOR.strangerAt, fireMin: 0.3, atCamp: true },
    effects: [{ chapter: 2 }, { next: 'stranger' }],
  },
  {
    id: 'hands',
    when: { popMin: 1, memories: ['name'] },
    effects: [{ log: 'There are hands here now besides yours. They will do what you ask of them.' }],
  },
  {
    id: 'roof',
    when: { built: ['leanto'] },
    effects: [{ log: 'There is room under the roof for more than two. A fire like this gets seen.' }],
  },
  {
    id: 'second',
    when: { popMin: 2 },
    effects: [
      { chapter: 3 },
      { flag: 'loc-creek' },
      { log: 'They talk low, the two of them. One mentions an old camp down the creek, and a road past it.' },
      { sfx: 'unlock' },
    ],
  },
  {
    id: 'radio-idea',
    when: { has: { parts: 1 } },
    effects: [
      { flag: 'radio-idea' },
      { log: 'Radio boards. With wire, and cells, and a tall enough pole, someone might hear you.' },
      { sfx: 'unlock' },
    ],
  },
  {
    id: 'first-snow',
    when: { coldMin: SEASON.strettoCold, atCamp: true },
    effects: [{ chapter: 4 }, { weather: 'snow' }, { next: 'first-snow' }],
  },
  {
    id: 'frost',
    when: { built: ['garden'], coldMin: SEASON.frostCold },
    effects: [
      { grant: { forage: 6 } },
      { log: 'Frost takes the garden overnight. You pull what is left out of the hard ground.', tone: 'warn' },
    ],
  },
  {
    id: 'recognised',
    when: { memories: ['script'], popMin: 1, phase: ['night'], fireMin: 0.2, atCamp: true },
    effects: [{ next: 'recognised' }],
  },
  {
    id: 'the-last-of-it',
    when: { memories: ['loop'], phase: ['night'], atCamp: true },
    effects: [{ next: 'the-last-of-it' }],
  },
  {
    id: 'mast',
    when: { built: ['radio'] },
    effects: [{ chapter: 5 }, { log: 'The mast is up. All it needs now is something to say.' }],
  },
  {
    id: 'longest-nights',
    when: { dayMin: SEASON.codaDay },
    effects: [
      { chapter: 5 },
      { flag: 'may-leave' },
      { log: 'The longest nights. Whatever this has been building toward, it is close.' },
    ],
  },
  {
    id: 'thaw',
    when: { dayMin: SEASON.thawDay, phase: ['dawn', 'day'], atCamp: true },
    effects: [{ end: 'thaw' }],
  },
];
