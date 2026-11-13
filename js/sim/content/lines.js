/**
 * Pools of one-line prose for things that happen often. Systems pick from a pool
 * without repeating the previous choice, so more lines here means a livelier log.
 * Pools with a `when` are only drawn from while the condition holds.
 */

export const OPENING_LINES = [
  'Dark. Cold. The smell of smoke.',
  'A fire, almost out, an arm’s length from your face.',
];

export const PHASE_LINES = {
  dawn: [
    'Grey light comes up behind the trees.',
    'Dawn. The cold is sharpest now.',
    'Morning, such as it is.',
    'The dark thins. Shapes become trunks again.',
    'First light. Everything is where you left it.',
  ],
  dusk: [
    'The light is going.',
    'Dusk. The trees draw closer.',
    'Evening comes down fast.',
    'The sky goes the colour of slate.',
  ],
  night: [
    'Night. The fire is the only thing with edges.',
    'Full dark now.',
    'Night closes over the camp.',
    'Dark. The woods begin to make their sounds.',
  ],
};

/** Logged when the fire sinks into a lower band. */
export const FIRE_FADING_LINES = {
  low: ['The fire is burning low.', 'The flames shrink back into the wood.'],
  embers: ['The fire has sunk to embers.', 'Only embers now. They tick as they cool.'],
  dead: ['The fire is out.', 'The last ember goes dark.'],
};

export const KEEPER_RELIGHT_LINES = [
  '{name} kneels over the dead fire and coaxes it back.',
  '{name} gets the fire going again without a word.',
];

export const AMBIENT_LINES = [
  {
    when: {},
    lines: [
      'Wind moves through the tops of the pines.',
      'A branch cracks somewhere and is not followed by anything.',
      'Smoke stings your eyes.',
      'The trees creak.',
      'Something small moves in the leaves and stops.',
      'A bird calls twice and gives up.',
      'You catch yourself listening for engines.',
    ],
  },
  {
    when: { weather: ['rain'] },
    lines: [
      'Rain ticks on the leaves.',
      'Water runs off the branches in strings.',
      'The fire spits at the rain.',
      'Everything you own is damp.',
    ],
  },
  {
    when: { weather: ['snow'] },
    lines: [
      'Snow falls without a sound.',
      'Snow settles on the woodpile.',
      'The world has gone white and close.',
      'Snow slides off a bough with a soft thump.',
    ],
  },
  {
    when: { weather: ['fog'] },
    lines: [
      'Fog stands between the trunks.',
      'You cannot see the far trees.',
      'Sound carries strangely in the fog.',
      'The fog makes a room of the firelight.',
    ],
  },
  {
    when: { weather: ['ash'] },
    lines: [
      'Ash drifts down, soft as moth wings.',
      'A grey flake lands on your wrist. It is not snow.',
      'Somewhere, something is still burning.',
      'Ash films the water in the pot.',
      'The ash has a smell. Paper, and under it something else.',
    ],
  },
  {
    when: { phase: ['night'], fireMin: 0.5 },
    lines: [
      'The firelight reaches the first row of trunks and no further.',
      'Sparks go up and are lost.',
      'The fire throws your shadow a long way.',
    ],
  },
  {
    when: { phase: ['night'], fireMax: 0.3 },
    lines: [
      'The dark leans in.',
      'You hear breathing that is not yours. Perhaps.',
      'Without the fire you cannot see your own hands.',
    ],
  },
  {
    when: { coldMin: 0.6 },
    lines: [
      'The cold has weight now.',
      'Trees crack in the frost like distant shots.',
      'Ice has formed in the water pot.',
      'Your breath freezes in your scarf.',
    ],
  },
  {
    when: { popMin: 3 },
    lines: [
      'Low talk around the fire.',
      'Someone laughs, briefly, and looks sorry for it.',
      'Someone is mending a boot by firelight.',
      'Two of them are arguing quietly about the best way to stack wood.',
    ],
  },
  {
    when: { flags: ['dog'] },
    lines: [
      'The dog lifts its head, listens, and lowers it again.',
      'The dog sleeps with its back to the fire and its nose to the trees.',
    ],
  },
];

/** Things survivors say, logged as `Name: “…”`. */
export const VOICE_LINES = [
  {
    when: {},
    lines: [
      'It’s good to hear a fire again.',
      'The wood’s wet, but it’ll burn.',
      'I had a house with a blue door. I think about the door more than the house.',
      'Don’t let it go out. Please.',
      'I walked eleven days. Yours was the first light I saw.',
      'You talk in your sleep. I can’t make out the words.',
      'My hands remember work. That’s something.',
      'Nobody told us where to go. They only told us where not to.',
    ],
  },
  {
    when: { popMin: 2 },
    lines: [
      'I keep counting us. I don’t know why.',
      'We should have a word for this place.',
    ],
  },
  {
    when: { chapterMin: 3, notMemories: ['voice'] },
    lines: [
      'We had the radio on the whole time. Right up until the batteries went.',
      'There was a voice on the emergency band. Very calm. I hated how calm.',
      'I know you from somewhere. It’ll come to me.',
    ],
  },
  {
    when: { coldMin: 0.4, coldMax: 0.6 },
    lines: ['Snow soon. You can smell it.', 'The geese went over last night. All of them.'],
  },
  {
    when: { coldMin: 0.6 },
    lines: [
      'I didn’t think I’d see another winter. I’m not sure I wanted to.',
      'The creek’s skinning over at the edges.',
      'If the fire holds, we hold.',
      'I can’t remember what warm feels like. Only that I liked it.',
    ],
  },
  {
    when: { weather: ['ash'] },
    lines: ['Ash again. I used to wonder what it was. I stopped.'],
  },
  {
    when: { phase: ['night'] },
    lines: ['Listen. No. It’s nothing.', 'I’ll sit up a while.'],
  },
  {
    when: { fireMax: 0.3 },
    lines: ['I can’t get warm.', 'The fire. Look at the fire.'],
  },
  {
    when: { memories: ['road'] },
    lines: ['Is it true the road east was open? Someone said that, after.'],
  },
  {
    when: { memories: ['voice'] },
    lines: [
      'I don’t blame you. I want to. It would be easier.',
      'My mother liked your voice. I’m only telling you so you know.',
    ],
  },
  {
    when: { memories: ['voice'], unbuilt: ['radio'] },
    lines: ['You could talk to them. Whoever’s left. They’d listen. They did before.'],
  },
];

export const PEOPLE_LINES = {
  /** Hungry while raw meat sits uncooked and no one is set to cook. */
  uncooked: [
    '{name} looks at the raw meat, then at you. No one has cooked it.',
    'There is meat, but no one to cook it. {name} goes without.',
  ],
  hungry: [
    'There is nothing to give {name}. They say nothing about it.',
    '{name} goes without.',
    '{name} scrapes the empty pot and puts it down.',
  ],
  thirsty: [
    '{name} holds the water pot upside down over an open mouth.',
    'There is no water for {name}.',
  ],
  cold: [
    'The cold gets into {name}’s chest.',
    '{name} cannot stop shaking.',
  ],
  sick: ['{name} is too weak to work.', '{name} lies down and does not get up again today.'],
  well: ['{name} is back on their feet.', '{name} looks stronger this morning.'],
  dead: [
    '{name} does not wake. You bury them where the ground is softest.',
    '{name} dies in the night, quietly, facing the fire.',
  ],
  left: [
    '{name} is gone by morning. The blanket is folded.',
    '{name} has walked out in the night. The tracks go east.',
  ],
  exiled: [
    '{name} goes without a word.',
    '{name} picks up their things and walks into the trees. Nobody watches them go.',
  ],
};

/** Said once, after a few actions, for anyone waiting on one button at a time. */
export const PARALLEL_TIP =
  'You don’t have to wait for one task to finish. Each keeps its own time: start the next while the last recovers.';

export const EXPEDITION_LINES = {
  empty: 'You carry nothing but what you came with.',
  carrying: 'You carry: {haul}.',
  home: [
    'You walk back into the firelight.',
    'The fire, between the trunks. You are back.',
    'You come home footsore, smelling of other places.',
  ],
  homeToDark: [
    'You come back to a dead fire.',
    'There is no light to walk toward. You find the camp by memory.',
  ],
};

/** Someone found the fire but every bed was taken. Each says why, so the player knows to build. */
export const TURNED_AWAY_LINES = [
  'Someone watched the fire from the trees for a long while, then moved on. There was no bed for them.',
  'Footsteps at the edge of the light. They saw every place by the fire taken, and kept walking.',
  'A shape in the dark, close enough to feel the heat. No room for one more. It turned away.',
];
