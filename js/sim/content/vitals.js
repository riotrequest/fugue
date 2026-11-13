/**
 * The player's vitals. Every value is "how well you are doing": 1 is warm, fed,
 * watered, whole. `notes` run from best to worst and are chosen by the same
 * thresholds that colour the bar (see systems/vitals.js).
 */
export const VITAL_DEFS = [
  {
    id: 'warmth',
    label: 'warmth',
    notes: ['warm', 'chilled', 'shivering', 'freezing'],
    warnings: [
      'You cannot feel your fingers.',
      'The cold is inside your coat now, inside your chest.',
      'You are shaking too hard to think. You need the fire.',
    ],
  },
  {
    id: 'food',
    label: 'food',
    notes: ['fed', 'peckish', 'hungry', 'starving'],
    warnings: [
      'Hunger is a fist under your ribs.',
      'Your hands are unsteady. You need to eat.',
      'You stand up and the trees tilt. You have to eat something.',
    ],
  },
  {
    id: 'water',
    label: 'water',
    notes: ['quenched', 'dry', 'thirsty', 'parched'],
    warnings: [
      'Your tongue is thick in your mouth.',
      'Your head pounds. You need water.',
      'Your lips have split. You have to drink.',
    ],
  },
  {
    id: 'health',
    label: 'health',
    notes: ['well', 'sore', 'hurt', 'failing'],
    warnings: [
      'Something in you is giving way.',
      'You are weaker than you were this morning.',
      'Every movement costs more than it should.',
    ],
  },
];

/** Names for the fire as a vital and in the status line, keyed by fire band. */
export const FIRE_STATES = {
  dead: { label: 'the fire is dead', note: 'dead' },
  embers: { label: 'the fire is embers', note: 'embers' },
  low: { label: 'the fire is burning low', note: 'low' },
  burning: { label: 'the fire is burning', note: 'burning' },
  roaring: { label: 'the fire is roaring', note: 'roaring' },
};
