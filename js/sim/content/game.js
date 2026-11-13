/**
 * What the snares and the spear can bring back. Each animal yields what its
 * size deserves: a rabbit is one cut of meat, a deer is several and its hide.
 * Used by the player's own "check the snares" and "hunt", and by the trapper
 * and hunter jobs.
 *
 * A ground's `scarce` (0..1) is how much the season and weather thin out the
 * chance of catching anything at all; an animal's own `scarce` makes it rarer
 * still in hard times (deer move off in deep winter).
 *
 * @typedef {object} Catch
 * @property {string} id
 * @property {number} weight
 * @property {number} [scarce]
 * @property {import('../systems/yields.js').YieldDef[]} yields   no `scarce` here: the ground handles that
 * @property {string[]} lines     logged when the player makes this catch
 * @property {string} [worker]    logged when a worker brings it in; `{name}` is the worker
 *
 * @typedef {object} Ground
 * @property {number} scarce
 * @property {Catch[]} catches
 * @property {string[]} empty     logged when the player comes back with nothing
 */

/** @type {Record<string, Ground>} */
export const GAME_GROUNDS = {
  snares: {
    scarce: 0.8,
    catches: [
      {
        id: 'rabbit',
        weight: 5,
        yields: [
          { id: 'meat', amount: 1 },
          { id: 'hide', amount: 1, chance: 0.2, tool: 'knife', toolFactor: 2 },
        ],
        lines: [
          'One loop holds a rabbit, stiff with cold.',
          'Two empty. One not: a rabbit.',
          'A hare in the last loop. You reset the rest with stiff fingers.',
        ],
      },
      {
        id: 'pair',
        weight: 3,
        yields: [
          { id: 'meat', amount: 2 },
          { id: 'hide', amount: 1, chance: 0.3, tool: 'knife', toolFactor: 2 },
        ],
        lines: ['Two loops, two rabbits. A good morning.'],
      },
      {
        id: 'fox',
        weight: 1,
        yields: [
          { id: 'meat', amount: 1 },
          { id: 'hide', amount: 1, tool: 'knife', toolFactor: 2 },
        ],
        lines: ['A fox, caught by the foreleg. Not much meat, but the pelt is thick.'],
        worker: '{name} brings a fox in from the snare line. The pelt is thick.',
      },
    ],
    empty: [
      'Every loop is empty. You reset them with stiff fingers.',
      'Something has been taken from the third snare before you got to it.',
      'Tracks all along the line, and nothing in it.',
    ],
  },

  hunt: {
    scarce: 0.6,
    catches: [
      {
        id: 'rabbit',
        weight: 3,
        yields: [
          { id: 'meat', amount: 1 },
          { id: 'hide', amount: 1, chance: 0.3 },
        ],
        lines: ['A rabbit breaks cover. One throw. It is enough.', 'A hare, white already for winter. Small, but it is meat.'],
      },
      {
        id: 'grouse',
        weight: 3,
        yields: [{ id: 'meat', amount: 1 }],
        lines: ['A grouse bursts out of the snow at your feet. You are quicker than it is.'],
      },
      {
        id: 'deer',
        weight: 3,
        scarce: 0.3,
        yields: [
          { id: 'meat', amount: [3, 5] },
          { id: 'hide', amount: [1, 2] },
        ],
        lines: [
          'You wait an hour without moving. Then you move once. A deer.',
          'Tracks, then the deer, then the throw. You come back with blood on your sleeves and meat for days.',
        ],
        worker: '{name} comes back with a deer across their shoulders.',
      },
    ],
    empty: [
      'You wait an hour without moving. Nothing comes.',
      'The throw goes wide. You come back with nothing.',
      'Old tracks, going away. You follow them until the light turns.',
    ],
  },
};
