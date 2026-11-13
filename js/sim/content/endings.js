import { indexById } from '../util.js';

/**
 * How the piece can close. Each ending lists text variants; the first whose
 * condition holds is used, so the same act reads differently depending on what
 * the player has remembered and who is left at the fire.
 *
 * @typedef {object} EndingDef
 * @property {string} id
 * @property {string} title
 * @property {boolean} death
 * @property {string} [afterword]  when set, the player may keep playing after this ending; logged as they do
 * @property {{ when?: object, text: string[] }[]} variants  last entry is unconditional
 */

/** @type {EndingDef[]} */
export const ENDINGS = [
  {
    id: 'beacon',
    title: 'A New Subject',
    death: false,
    afterword: 'You keep the frequency open. You keep the fire high. Whoever is coming will need it.',
    variants: [
      {
        when: { memories: ['loop'] },
        text: [
          'You climb the mast at dusk and clip the last lead. The needle lifts. For a moment you cannot do it. Then you press the key, and the voice the whole valley trusted comes out of you one more time.',
          '“This is not a recording. I am the one who told you to stay. I was wrong, and I knew it, and I am sorry. There is a fire on the ridge above the creek. There is food, and a roof. I cannot promise more than that. Come if you can.”',
          'You say it every night at the same hour. On the eleventh night the static thins and something answers, faint and wavering, the sound of a set that is being cranked by hand. A stranger’s voice. Not hers.',
          'You keep the frequency open. You keep the fire high.',
        ],
      },
      {
        text: [
          'You climb the mast at dusk and clip the last lead. The needle lifts. You press the key, and find that you know exactly how to do this: how close to sit, where to breathe, how to make a sentence sound like a promise.',
          '“There is a fire on the ridge above the creek. Remain calm. Help is being arranged.”',
          'The words come so easily. You do not ask yourself why.',
          'Across the dark valley, people who have heard that voice before lift their heads. Some of them begin to walk toward it. Some of them switch their radios off.',
        ],
      },
    ],
  },
  {
    id: 'walk',
    title: 'Tacet',
    death: false,
    variants: [
      {
        when: { memories: ['walk'], popMin: 1 },
        text: [
          'You bank the fire high and stack the wood where they will find it. You leave the axe and the knife. You take one skin of water.',
          'At the tree line you do not look back. Looking back is a way of asking to be forgiven, and that was never theirs to give.',
          'The road east is open. It has been open all along. Somewhere on it, or past it, there may be a yellow radio with a strip of tape across the dial.',
          'You walk until the fire is one more star, and then you keep walking.',
        ],
      },
      {
        when: { memories: ['walk'] },
        text: [
          'There is no one to leave the fire to. You feed it anyway, one last armful, so that it will outlast your sight of it.',
          'The road east is open. It has been open all along. Somewhere on it, or past it, there may be a yellow radio with a strip of tape across the dial.',
          'You walk until the fire is one more star, and then you keep walking.',
        ],
      },
      {
        when: { popMin: 1 },
        text: [
          'You leave before they wake. You tell yourself it is because they know what you were, and you do not, and you cannot sit across a fire from that.',
          'The forest takes you back the way it gave you up: without a name.',
          'Behind you the fire burns on. Someone else is feeding it now.',
        ],
      },
      {
        text: [
          'You step over the stones and into the dark. Nothing calls you back.',
          'The forest takes you the way it gave you up: without a name, without a reason.',
          'Behind you the fire burns down to embers, and waits for whoever finds it next.',
        ],
      },
    ],
  },
  {
    id: 'thaw',
    title: 'Resolution',
    death: false,
    afterword: 'Spring, then. The days are longer. The fire still needs feeding.',
    variants: [
      {
        when: { memories: ['walk'], popMin: 1 },
        text: [
          'The creek breaks open in the night with a sound like a door. By morning there is water moving under the ice and a patch of black earth beside the woodpile.',
          'The {count} of you stand and look at it. Nobody says anything clever.',
          'They know what you did. They stayed anyway, or they had nowhere else to go; you have stopped needing to know which. You still do not use your name. They have given you another one: the one who keeps the fire.',
          'You put a log on. It catches.',
        ],
      },
      {
        when: { popMin: 1 },
        text: [
          'The creek breaks open in the night with a sound like a door. By morning there is water moving under the ice and a patch of black earth beside the woodpile.',
          'The {count} of you stand and look at it. Nobody says anything clever.',
          'You never did find out all of who you were. The winter did not ask. The fire did not ask. There is a part of you that knows the spring will.',
          'You put a log on. It catches.',
        ],
      },
      {
        text: [
          'The creek breaks open in the night with a sound like a door. By morning there is water moving under the ice.',
          'You are the only one there to hear it. You kept one fire alive through one winter, for no one, and you are not sure that it was nothing.',
          'You put a log on. It catches.',
        ],
      },
    ],
  },
  {
    id: 'frozen',
    title: 'Fermata',
    death: true,
    variants: [
      {
        when: { memories: ['script'] },
        text: [
          'The cold stops hurting. That is how you know.',
          'The fire is a grey shape, and then not even that. Snow settles on your sleeve and does not melt.',
          'The last thing in your head is a sentence you know by heart. Remain where you are. You do.',
        ],
      },
      {
        text: [
          'The cold stops hurting. That is how you know.',
          'The fire is a grey shape, and then not even that. Frost settles on your sleeve and does not melt.',
          'You never learned your name. The trees do not need it.',
        ],
      },
    ],
  },
  {
    id: 'starved',
    title: 'Diminuendo',
    death: true,
    variants: [
      {
        text: [
          'You sit down to rest, only for a moment, with your back against a trunk.',
          'There is a little warmth from the fire on one side of your face. You watch it as long as you can keep your eyes open, which is not long.',
          'Whoever you were, the forest keeps it.',
        ],
      },
    ],
  },
  {
    id: 'taken',
    title: 'Caesura',
    death: true,
    variants: [
      {
        when: { atCamp: false },
        text: [
          'You do not come back from the ruins.',
          'At the camp the fire burns down through the evening. Nobody comes out of the trees to feed it.',
        ],
      },
      {
        text: [
          'It comes out of the tree line when the light is lowest, and it is quick.',
          'The fire is the last thing you see. It is very small, and a long way off.',
        ],
      },
    ],
  },
];

export const ENDING_BY_ID = indexById(ENDINGS);

/** Which ending follows when health runs out, keyed by what did the most recent harm. */
export const DEATH_BY_HARM = {
  cold: 'frozen',
  hunger: 'starved',
  thirst: 'starved',
  wound: 'taken',
};
