import { DIRECTOR, SEASON } from '../tuning.js';

/** Chapter titles, named for the parts of a fugue. Index 0 is chapter 1. */
export const CHAPTERS = [
  'I · Subject',
  'II · Answer',
  'III · Countersubject',
  'IV · Stretto',
  'V · Coda',
  'VI · Episode',
  'VII · Development',
  'VIII · Recapitulation',
  'IX · Cadence',
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
    // Halfway to being seen: a hint that a big fire is a signal.
    id: 'seen-far',
    when: { roaringMin: DIRECTOR.roaringHint, notFlags: ['done:stranger'], atCamp: true },
    effects: [
      {
        log: 'The fire throws its light a long way into the trees tonight, further than you meant it to. Anyone out there could see it.',
      },
    ],
  },
  {
    // Whichever comes first: enough time, or a fire kept roaring long enough to be seen from the ridge.
    id: 'stranger',
    when: {
      anyOf: [{ elapsedMin: DIRECTOR.strangerAt }, { roaringMin: DIRECTOR.roaringCall }],
      fireMin: 0.3,
      atCamp: true,
    },
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
    // The notebook (systems/research.js): somewhere to think things through.
    id: 'notebook',
    when: { anyOf: [{ built: ['workbench'] }, { dayMin: 5, popMin: 2 }], atCamp: true },
    effects: [
      { flag: 'notebook' },
      {
        log: 'In the lining of your coat, a notebook you did not know you had: most of its pages blank, a stub of pencil in the spine. You start to write down what you know.',
        tone: 'good',
      },
      { sfx: 'unlock' },
    ],
  },
  {
    // A second year, and a map with its gaps: the pass out of the valley (content/frontier.js).
    id: 'the-pass',
    when: { yearMin: 2, researched: ['maps'], atCamp: true },
    effects: [
      { flag: 'loc-pass' },
      { log: 'With the snow off the high ground, the gap at the head of the valley shows on the map at last: a pass, and a path to it.', tone: 'good' },
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

  // After the thaw, for those who stay: a turning year, and a second winter to come.
  {
    id: 'episode',
    when: { flags: ['continued:thaw'] },
    effects: [
      { chapter: 6 },
      { record: 'The first winter ended. Everyone who was left stayed.' },
      { log: 'The snow goes off the clearing in a week. Under it, the ground is still there. So are you. Now the work is not surviving but building something worth surviving for.' },
    ],
  },
  {
    id: 'development',
    when: { season: ['summer'], yearMin: 2 },
    effects: [
      { chapter: 7 },
      { log: 'Summer. The days are long enough to get tired in. Somebody points out that the next winter is coming, and that it will find you ready or it will not.' },
    ],
  },
  {
    id: 'harvest',
    when: { season: ['autumn'], yearMin: 2 },
    effects: [{ log: 'The leaves turn. Everything the camp gathers now is for the winter. Fill the stores; the cold will empty them.', tone: 'warn' }],
  },
  {
    id: 'recapitulation',
    when: { season: ['winter'], yearMin: 2 },
    effects: [
      { chapter: 8 },
      { record: 'The second winter came.' },
      { log: 'The first snow of the second winter. It is the same snow. You are not the same.', tone: 'warn' },
    ],
  },
  {
    id: 'cadence',
    when: { season: ['winter'], yearMin: 2, seasonLeftMax: 4 },
    effects: [
      { chapter: 9 },
      { log: 'The deepest of the second winter is behind you. A few more days, and it will be a year since you woke by an almost-dead fire with nothing in your head.' },
    ],
  },
  {
    // A second thaw: a year lived through, and a settlement where a fire was.
    id: 'second-thaw',
    when: { yearMin: 3, phase: ['dawn', 'day'], atCamp: true },
    effects: [{ end: 'settled' }],
  },
];
