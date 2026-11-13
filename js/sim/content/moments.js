/**
 * Small happenings told in the log, with no card and no choice: the life of the
 * camp going on around the player. The director draws one every couple of
 * minutes from those whose `when` holds and whose cast can be filled. Some leave
 * a small mark through `effects` (a little trust, a bond, a handful of food).
 *
 * Kept quiet on purpose. A moment never threatens anyone's life; that is what
 * incidents are for.
 *
 * @typedef {object} MomentDef
 * @property {string} id
 * @property {string|string[]} text     `{name}` and `{other}` are the cast (systems/modal.js)
 * @property {'normal'|'good'|'warn'|'voice'} [tone]
 * @property {string} [cast]            a cast kind from systems/modal.js
 * @property {object} [when]
 * @property {object[]} [effects]
 * @property {number} [weight]
 * @property {number} [every]           seconds before it may happen again (default 1500)
 */

/** @type {MomentDef[]} */
export const MOMENTS = [
  // The world beyond the camp.
  {
    id: 'fox-midden',
    when: { phase: ['dusk', 'night'], popMin: 1 },
    text: 'A fox works at the midden in the half-dark, unafraid, and trots off with something pale in its mouth.',
  },
  {
    id: 'geese',
    when: { season: ['spring', 'autumn'] },
    text: [
      'Geese go over, high up, calling to one another. Everyone stops to watch until they are gone.',
      'A long wavering line of geese, heading somewhere they are sure of.',
    ],
    every: 900,
  },
  {
    id: 'far-dog',
    when: { phase: ['night'] },
    text: 'Somewhere a long way off a dog barks, and barks, and then stops as if someone told it to.',
    every: 2400,
  },
  {
    id: 'thaw-drip',
    when: { season: ['spring'] },
    text: 'Water runs off every branch. The whole wood ticks and patters with it, like a clock shop.',
  },
  {
    id: 'summer-insects',
    when: { season: ['summer'], phase: ['dusk', 'night'] },
    text: 'Insects come to the firelight in drifts. Somebody swears and slaps at the back of their neck.',
  },
  {
    id: 'frost-ferns',
    when: { coldMin: 0.6, phase: ['dawn'] },
    text: 'Frost has grown ferns across every water pot in the night. Somebody breaks theirs with a knuckle, almost sorry to.',
  },
  {
    id: 'deer-tracks',
    when: { phase: ['dawn', 'day'], popMin: 1 },
    cast: 'survivor',
    text: '{name} comes back from the latrine trench to report deer tracks, fresh, right through the middle of camp.',
    every: 2000,
  },

  // People being people.
  {
    id: 'shared-coat',
    cast: 'pair',
    when: { coldMin: 0.5, popMin: 2 },
    text: '{name} and {other} end up sharing one coat over two pairs of shoulders. Neither of them suggested it.',
    effects: [{ bond: 'friend' }],
    every: 3000,
  },
  {
    id: 'card-game',
    cast: 'pair',
    when: { popMin: 2, phase: ['dusk', 'night'] },
    text: '{name} teaches {other} a card game with a deck that is missing the four of clubs. They play until the fire is low, laughing more than the game deserves.',
    effects: [{ bond: 'friend' }],
    every: 3000,
  },
  {
    id: 'carving',
    cast: 'survivor',
    when: { popMin: 1 },
    text: [
      '{name} sits whittling a scrap of pine into something with legs. A dog, maybe. Or a horse.',
      '{name} hums the same four notes over and over while they mend a strap. It is not a song you know.',
    ],
  },
  {
    id: 'snore',
    cast: 'survivor',
    when: { phase: ['night'], popMin: 2 },
    text: '{name} snores like a saw going through wet wood. Someone throws a mitten. It does not help.',
    every: 2400,
  },
  {
    id: 'old-joke',
    cast: 'friends',
    when: { popMin: 2 },
    text: '{name} says one word, and {other} laughs until they have to sit down. You ask what is funny. Neither of them can explain it.',
    effects: [{ trust: { who: 'pair', delta: 0.02 } }],
  },
  {
    id: 'cold-shoulder',
    cast: 'rivals',
    when: { popMin: 2 },
    text: [
      '{name} gets up and moves to the far side of the fire the moment {other} sits down.',
      '{name} and {other} reach the water pot together. A long, stiff moment, and then {other} lets {name} go first, like a door being slammed.',
    ],
  },
  {
    id: 'thanks',
    cast: 'loyal',
    when: { popMin: 1 },
    text: [
      '{name} brings you the first cup from the pot without being asked, and goes back to work before you can say anything.',
      '{name} has mended the tear in your sleeve while you slept. Small stitches, very neat.',
    ],
  },
  {
    id: 'muttering',
    cast: 'wary',
    when: { popMin: 2 },
    tone: 'warn',
    text: [
      'You come back to the fire and the talk stops. {name} looks at the flames as if they had been looking at them all along.',
      '{name} counts the stores when they think nobody is watching, lips moving.',
    ],
  },
  {
    id: 'the-dead-place',
    cast: 'mourner',
    when: { deadMin: 1 },
    text: [
      '{name} sets out a cup for {lost} at supper, then sees what they have done and puts it back without a word.',
      'Someone has scratched {lost} into the bark of the big pine by the trail, at about the height {lost} would have stood.',
    ],
    every: 3600,
  },
  {
    id: 'remember-gone',
    cast: 'survivor',
    when: { goneMin: 1 },
    text: '{name} wonders aloud where the ones who walked out are now. Nobody answers, and after a while they stop wondering out loud.',
    every: 4000,
  },

  // Small marks on the stores and the camp.
  {
    id: 'birds-eggs',
    cast: 'survivor',
    when: { season: ['spring', 'summer'], atCamp: true },
    text: '{name} comes back with their hat held carefully in both hands: six speckled eggs, still warm.',
    effects: [{ grant: { forage: 2 } }],
    every: 2400,
  },
  {
    id: 'windfall',
    when: { weather: ['rain', 'snow'] },
    text: 'In the night a dead limb came down at the edge of camp. Dry wood at the heart of it, and plenty.',
    effects: [{ grant: { wood: [2, 4] } }],
    every: 2400,
  },
  {
    id: 'mouse-stores',
    when: { has: { rations: 6 } },
    tone: 'warn',
    text: 'Mice have been at the stores. Small dark droppings, and a ration wrapper chewed to lace.',
    effects: [{ take: { rations: 1 } }],
    every: 2600,
  },
  {
    id: 'lost-glove',
    cast: 'survivor',
    when: { coldMin: 0.4 },
    text: '{name} has lost a glove somewhere between the woodpile and the fire, and spends an hour looking for it with one hand in their armpit.',
  },
  {
    id: 'garden-shoots',
    when: { built: ['garden'], season: ['spring', 'summer'] },
    tone: 'good',
    text: 'The first green has pushed up through the garden in a row as straight as a ruler. Everyone goes to look, then pretends they had not.',
    every: 3600,
  },
  {
    id: 'watch-stars',
    cast: 'guard',
    when: { phase: ['night'], weather: ['clear'] },
    text: '{name}, on watch, has been naming stars under their breath. None of the names are real, but they sound right.',
  },
  {
    id: 'sick-better',
    cast: 'sick',
    text: '{name} asks for a second cup of broth and drinks it sitting up. Someone says that is a good sign. Everyone agrees, a little too quickly.',
    effects: [{ person: { who: 'cast', health: 0.06 } }],
  },
  {
    id: 'story-night',
    when: { popMin: 4, phase: ['night'] },
    tone: 'good',
    cast: 'survivor',
    text: '{name} tells the story of how they got here. It is a different story from last time, and nobody minds.',
    effects: [{ trust: { who: 'all', delta: 0.01 } }],
    every: 2400,
  },
  {
    id: 'lullaby',
    when: { popMin: 3, phase: ['night'] },
    text: 'Someone is singing very quietly on the far side of the fire. By the second verse two more voices have found it.',
    effects: [{ trust: { who: 'all', delta: 0.01 } }],
    every: 3000,
  },
  {
    id: 'heat-shade',
    when: { season: ['summer'], phase: ['day'] },
    text: 'The heat sits in the clearing like water in a bowl. Work slows. Everyone finds a reason to be near the creek.',
  },
  {
    id: 'smoke-plume',
    when: { yearMin: 2 },
    text: 'Far off to the north there is smoke, a thin grey thread going straight up into still air. Someone else has a fire too.',
    every: 3000,
  },
];
