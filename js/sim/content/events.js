import { indexById } from '../util.js';
import { ENCOUNTERS } from './encounters.js';
import { TRADER_PARTING } from './trader.js';

/**
 * Modal story events. While one is open the world waits for a choice.
 *
 * @typedef {object} ChoiceDef
 * @property {string} id
 * @property {string} label
 * @property {string} [hint]
 * @property {Record<string, number>} [cost]  spent when chosen
 * @property {string[]} [tools]               gear needed but not spent
 * @property {object} [when]                  the choice is only offered while this holds
 * @property {object[]} effects               see systems/effects.js
 *
 * @typedef {object} EventDef
 * @property {string} id
 * @property {string} title
 * @property {string|string[]} text           paragraphs; `{name}` is the cast member
 * @property {'normal'|'good'|'warn'|'danger'|'memory'|'voice'} [tone]
 * @property {'newcomer'|'survivor'} [cast]   who `{name}` is: a new arrival or someone at the fire
 * @property {object} [when]                  for arrivals and incidents: when it may happen
 * @property {number} [weight]                relative likelihood among eligible events (default 1)
 * @property {number} [every]                 seconds before an incident may recur
 * @property {ChoiceDef[]} choices            at least one must always be available
 */

const SETTLES_IN = {
  log: [
    '{name} sits down at the fire.',
    '{name} finds a place in the light and holds out both hands to it.',
    'Room is made. {name} is one of you now.',
    '{name} sets down a small bundle and looks at the flames for a long time.',
  ],
  tone: 'good',
};

const WELCOME = [{ arrive: true }, { sfx: 'arrive' }, SETTLES_IN];

const TURN_AWAY = {
  id: 'refuse',
  label: 'turn them away',
  hint: 'there is not enough for another',
  effects: [
    {
      log: [
        '{name} nods, as if that was the answer they expected, and goes back into the trees.',
        '{name} looks at the fire a moment longer. Then at you. Then they go.',
        'You shake your head. {name} does not argue. That is the worst of it.',
      ],
    },
  ],
};

/** Events the story opens at fixed points. @type {EventDef[]} */
const STORY_EVENTS = [
  {
    // The deals themselves are made fresh for each visit and carried in the event's ctx.offers.
    id: 'trader',
    title: 'A trader',
    tone: 'good',
    text: '{pitch}',
    choices: [{ id: 'part', label: 'send them on their way', effects: [{ log: TRADER_PARTING }] }],
  },
  {
    id: 'stranger',
    title: 'Someone at the edge',
    cast: 'newcomer',
    text: [
      'Someone is standing where the firelight gives out. They have been there a while. You can tell by how still they are.',
      '“I saw it from the ridge,” a voice says. “Two nights I’ve been walking at it. I’ll go, if you want me gone.”',
    ],
    choices: [
      {
        id: 'room',
        label: 'make room',
        hint: 'there is space by the fire',
        effects: [...WELCOME, { next: 'asked-name' }],
      },
      {
        id: 'silent',
        label: 'say nothing',
        hint: 'the fire is not yours to refuse',
        effects: [
          { log: 'You say nothing. After a while they come in and sit down anyway.' },
          ...WELCOME,
          { next: 'asked-name' },
        ],
      },
    ],
  },
  {
    id: 'asked-name',
    title: 'And you?',
    text: [
      'They hold their hands to the heat until the shaking stops. “{name},” they say, and pass you half a strip of dried apple, as though the two things went together.',
      '“And you?”',
    ],
    choices: [
      {
        id: 'answer',
        label: 'tell them your name',
        effects: [
          {
            memory: 'name',
            then: [
              { log: '{name}: “Then I won’t call you anything. Not yet.”', tone: 'voice' },
              { log: '{name}: “We’ll want a roof. And an edge on something.”', tone: 'voice' },
              { sfx: 'unlock' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'memory',
    title: '',
    text: '',
    tone: 'memory',
    choices: [{ id: 'keep', label: 'hold on to it', effects: [] }],
  },
  {
    id: 'first-snow',
    title: 'First snow',
    tone: 'warn',
    text: [
      'It starts in the afternoon: a few dry flakes that do not melt on your sleeve. By dusk the ground is grey-white and the creek sounds different.',
      'Winter is not coming any more. It is here, and it will get worse before it gets better.',
    ],
    choices: [
      {
        id: 'watch',
        label: 'watch it come down',
        effects: [{ log: 'Everything that needs doing will now need doing in the cold.', tone: 'warn' }],
      },
      {
        id: 'work',
        label: 'count the woodpile',
        effects: [{ log: 'You count the woodpile. Then you count it again.', tone: 'warn' }],
      },
    ],
  },
  {
    id: 'recognised',
    title: 'Say that again',
    cast: 'survivor',
    text: [
      '{name} has been watching you across the fire all evening. You ask whether they are warm enough, and they go very still.',
      '“Say that again,” {name} says. “Slower. The way you’d say it if you were reading it out.”',
    ],
    choices: [
      {
        id: 'say',
        label: 'say it again',
        effects: [
          {
            memory: 'voice',
            then: [
              { flag: 'may-leave' },
              { log: 'Nobody speaks for a long time. The fire needs wood. You are the one who gets up.' },
            ],
          },
        ],
      },
      {
        id: 'silence',
        label: 'say nothing',
        hint: 'they already know',
        effects: [
          {
            memory: 'voice',
            then: [
              { flag: 'may-leave' },
              { log: 'Your silence is answer enough. {name} looks into the fire and does not look up.' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'the-last-of-it',
    title: 'The last of it',
    tone: 'memory',
    text: [
      'The night is quiet. The fire is steady. There is nothing to do with your hands.',
      'It has been coming for days, the last of it, the way weather comes. You could get up and find some work. You stay where you are.',
    ],
    choices: [
      {
        id: 'stay',
        label: 'let it come',
        effects: [
          {
            memory: 'walk',
            then: [
              { flag: 'may-leave' },
              { log: 'You know who you are. The fire burns exactly as it did.' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'treeline',
    title: 'The tree line',
    tone: 'danger',
    text: [
      'The dark has come in close. Something moves at the tree line, and then something else, further round. Not wind.',
      'They are waiting to see what the fire does.',
    ],
    choices: [
      {
        id: 'blaze',
        label: 'heap wood on the fire',
        cost: { wood: 4 },
        effects: [
          { fuel: 4 },
          { threat: 0.2 },
          { log: 'The flames climb past your shoulder. Whatever is out there does not like to be seen.', tone: 'good' },
        ],
      },
      {
        id: 'spear',
        label: 'step out with the spear',
        tools: ['spear'],
        effects: [
          {
            roll: 0.7,
            pass: [
              { threat: 0.1 },
              { grant: { meat: 2, hide: 1 } },
              { log: 'It comes in low. You are lower. In the morning you drag it to the fire.', tone: 'good' },
            ],
            fail: [
              { threat: 0.3 },
              { vital: { health: -0.25 } },
              { log: 'You drive them off. Not before one of them reaches you.', tone: 'danger' },
            ],
          },
        ],
      },
      {
        id: 'noise',
        label: 'shout, and beat the pot',
        hint: 'it may be enough',
        effects: [
          {
            roll: 0.45,
            pass: [{ threat: 0.4 }, { log: 'The shapes pull back. They do not go far.', tone: 'warn' }],
            fail: [
              { threat: 0.3 },
              { take: { rations: 4, meat: 3, forage: 4 } },
              { vital: { health: -0.2 } },
              { person: { who: 'random', health: -0.25 } },
              { log: 'They come through the camp like water. When it is over the food store is torn open and there is blood on the ground.', tone: 'danger' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'beacon',
    title: 'The mast',
    text: [
      'The mast stands a little crooked against the sky. The cells are wired. The key is under your hand.',
      'Whatever goes out from here will go a long way, to anyone who still has a set and the will to listen.',
    ],
    choices: [
      {
        id: 'speak',
        label: 'press the key and speak',
        effects: [{ flag: 'beacon' }, { end: 'beacon' }],
      },
      {
        id: 'wait',
        label: 'not yet',
        effects: [{ log: 'You take your hand off the key. The mast hums in the wind.' }],
      },
    ],
  },
  {
    id: 'leave',
    title: 'The dark between the trees',
    text: [
      'The fire is high. Nobody is watching you.',
      'You could go now. East, where the road is. The fire would go on without you, or it would not.',
    ],
    choices: [
      { id: 'go', label: 'go', effects: [{ end: 'walk' }] },
      { id: 'stay', label: 'sit back down', effects: [{ log: 'You sit back down. Not tonight.' }] },
    ],
  },
  {
    id: 'caught-stealing',
    title: 'Caught',
    tone: 'warn',
    cast: 'survivor',
    text: [
      'You come back to the stores sooner than anyone expected, and {name} is there with their hands full: {took}.',
      'They do not put it down. They watch you to see what you will do.',
    ],
    choices: [
      {
        id: 'exile',
        label: 'drive them out',
        hint: 'they may take more on the way',
        effects: [{ exile: 'cast' }],
      },
      {
        id: 'share',
        label: 'give them a double share, and keep them close',
        hint: 'it might be hunger, not habit',
        cost: { rations: 2 },
        effects: [
          {
            roll: 0.5,
            pass: [{ reform: 'cast' }, { log: '{name} eats, and works, and nothing else goes missing. It was hunger after all.', tone: 'good' }],
            fail: [{ forgive: 'cast' }, { log: '{name} takes the food and thanks you. You are not sure it was hunger.', tone: 'warn' }],
          },
        ],
      },
      {
        id: 'forgive',
        label: 'let it go, this once',
        effects: [{ forgive: 'cast' }, { log: '{name} puts it back. Neither of you mentions it again.' }],
      },
    ],
  },
  {
    id: 'way-back',
    title: 'The way back',
    text: ['You turn for the fire while there is still light to find it by.', '{haul}'],
    choices: [{ id: 'home', label: 'walk back', effects: [{ home: true }] }],
  },
];

/** Strangers drawn to the fire. One is chosen whenever there is room and light. @type {EventDef[]} */
export const ARRIVALS = [
  {
    id: 'arrival-hands',
    title: 'Open hands',
    cast: 'newcomer',
    text: [
      'Someone comes down through the birches with both hands held open and away from their sides.',
      '“{name},” they say. “I can work. I don’t eat much.”',
    ],
    choices: [{ id: 'welcome', label: 'let them sit', effects: [...WELCOME] }, TURN_AWAY],
  },
  {
    id: 'arrival-boots',
    title: 'A second pair of boots',
    cast: 'newcomer',
    text: [
      '{name} arrives at dusk carrying a second pair of boots, tied by the laces and hung around their neck. They do not explain the boots.',
      'They ask whose fire this is. You find you do not have an answer.',
    ],
    choices: [{ id: 'welcome', label: 'say: yours too', effects: [...WELCOME] }, TURN_AWAY],
  },
  {
    id: 'arrival-rope',
    title: 'An offer',
    cast: 'newcomer',
    text: [
      'A figure at the tree line holds up a bundle. “Rope,” the voice says. “Good rope. And I know knots.”',
      '“Is that worth a place? I’m {name}.”',
    ],
    choices: [
      {
        id: 'welcome',
        label: 'it is worth a place',
        effects: [...WELCOME, { grant: { fiber: 5 } }],
      },
      TURN_AWAY,
    ],
  },
  {
    id: 'arrival-grey',
    title: 'Grey in the face',
    cast: 'newcomer',
    weight: 0.7,
    text: [
      'The newcomer is grey in the face and shaking, and does not ask for anything. They simply stop walking when they reach the light.',
      'After a while they manage a name. {name}.',
    ],
    choices: [
      {
        id: 'welcome',
        label: 'bring them to the fire',
        hint: 'they will need food and warmth before they can work',
        effects: [{ arrive: true, health: 0.45 }, { sfx: 'arrive' }, SETTLES_IN],
      },
      TURN_AWAY,
    ],
  },
  {
    id: 'arrival-photograph',
    title: 'A photograph',
    cast: 'newcomer',
    text: [
      '{name} shows you a photograph before saying anything else. A boy of about twelve, squinting into the sun.',
      'You shake your head. {name} nods, puts it away inside their coat, and stays standing.',
    ],
    choices: [{ id: 'welcome', label: 'tell them to sit', effects: [...WELCOME] }, TURN_AWAY],
  },
  {
    id: 'arrival-ash',
    title: 'Out of the ash',
    cast: 'newcomer',
    when: { weather: ['ash'] },
    weight: 3,
    text: [
      '{name} walks out of the ashfall with a scarf over their mouth, grey from hair to boots.',
      '“I thought it was a house burning,” they say. “I’m glad it’s only a fire.”',
    ],
    choices: [{ id: 'welcome', label: 'make room', effects: [...WELCOME] }, TURN_AWAY],
  },
  {
    id: 'arrival-tin',
    title: 'Something to share',
    cast: 'newcomer',
    text: [
      '{name} sets a dented tin on the ground at the edge of the light, steps back from it, and waits.',
      '“Peaches,” they say. “I’ve been saving them for somewhere worth it.”',
    ],
    choices: [
      {
        id: 'welcome',
        label: 'open the tin together',
        effects: [...WELCOME, { grant: { rations: 2 } }],
      },
      TURN_AWAY,
    ],
  },
];

/** Things that happen to the camp from time to time. @type {EventDef[]} */
export const INCIDENTS = [
  {
    id: 'eyes',
    title: 'Eyes',
    tone: 'warn',
    when: { phase: ['night'] },
    text: [
      'Two points of light, low down, at the edge of the dark. They do not blink. After a moment there are four.',
    ],
    choices: [
      {
        id: 'brand',
        label: 'throw a burning branch',
        cost: { wood: 1 },
        effects: [{ threat: 0 }, { log: 'The brand turns over in the air and lands in sparks. The lights are gone.' }],
      },
      {
        id: 'stare',
        label: 'stare back',
        effects: [
          {
            roll: 0.5,
            pass: [{ log: 'You look at them until they look away.' }],
            fail: [{ threat: 0.6 }, { log: 'They do not go. All night you feel them there.', tone: 'warn' }],
          },
        ],
      },
    ],
  },
  {
    id: 'fever',
    title: 'Fever',
    tone: 'warn',
    cast: 'survivor',
    when: { popMin: 1 },
    text: [
      '{name} is burning up. They talk to people who are not here and try to stand, and cannot.',
    ],
    choices: [
      {
        id: 'medicine',
        label: 'give them medicine',
        cost: { medicine: 1 },
        effects: [
          { person: { who: 'cast', health: 0.4 } },
          { log: 'By morning the fever has broken. {name} asks what day it is.', tone: 'good' },
        ],
      },
      {
        id: 'broth',
        label: 'broth, and the place nearest the fire',
        cost: { rations: 2, water: 1 },
        effects: [
          {
            roll: 0.6,
            pass: [{ person: { who: 'cast', health: 0.2 } }, { log: '{name} sweats it out by the fire.', tone: 'good' }],
            fail: [{ person: { who: 'cast', health: -0.2 } }, { log: '{name} cannot keep it down. The fever climbs.', tone: 'warn' }],
          },
        ],
      },
      {
        id: 'wait',
        label: 'let it run its course',
        effects: [
          {
            roll: 0.35,
            pass: [{ log: '{name} is weak in the morning, but clear-eyed.' }],
            fail: [{ person: { who: 'cast', health: -0.35 } }, { log: 'The fever takes a great deal out of {name}.', tone: 'warn' }],
          },
        ],
      },
    ],
  },
  {
    id: 'quarrel',
    title: 'Raised voices',
    tone: 'warn',
    when: { popMin: 3 },
    text: [
      'Raised voices at the woodpile. On its surface it is about who took the larger share last night. Underneath, it is about everything.',
    ],
    choices: [
      {
        id: 'share',
        label: 'share out extra rations',
        cost: { rations: 3 },
        effects: [
          { person: { who: 'all', health: 0.08 } },
          { log: 'They eat. Nobody apologises, but somebody passes the pot.', tone: 'good' },
        ],
      },
      {
        id: 'speak',
        label: 'tell them to stop',
        effects: [
          {
            roll: 0.55,
            pass: [{ log: 'Your voice does something to them. They stop mid-word and look at you oddly.' }],
            fail: [{ depart: 'random' }],
          },
        ],
      },
      {
        id: 'ignore',
        label: 'let them have it out',
        effects: [
          { person: { who: 'random', health: -0.15 } },
          { log: 'It ends in a shove and a split lip. The fire is very quiet afterwards.', tone: 'warn' },
        ],
      },
    ],
  },
  {
    id: 'gale',
    title: 'The wind gets up',
    tone: 'warn',
    when: { built: ['leanto'], unbuilt: ['cabin'] },
    text: [
      'Wind comes through the trees in one long push. The lean-to lifts on its poles like something trying to stand up.',
    ],
    choices: [
      {
        id: 'hold',
        label: 'hold the roof down',
        hint: 'you will be out in it',
        effects: [{ vital: { warmth: -0.2 } }, { log: 'You lie across the ridgepole until it blows itself out.' }],
      },
      {
        id: 'let',
        label: 'let it go, and mend it later',
        effects: [{ take: { wood: 5, fiber: 2 } }, { log: 'Half the roof ends up in the creek. You rebuild it from the woodpile.', tone: 'warn' }],
      },
    ],
  },
  {
    id: 'carcass',
    title: 'A deer',
    when: { phase: ['dawn', 'day'], chapterMin: 3 },
    text: [
      'A deer, down among the ferns a short way from camp, not long dead. Something else found it first, and may not have gone far.',
    ],
    choices: [
      {
        id: 'take',
        label: 'take what is left',
        effects: [
          {
            roll: 0.7,
            pass: [{ grant: { meat: 3, hide: 1 } }, { log: 'You work fast and carry it back still warm.', tone: 'good' }],
            fail: [{ vital: { health: -0.15 } }, { threat: 0.5 }, { log: 'It had not gone far. You get away with a torn sleeve and nothing else.', tone: 'warn' }],
          },
        ],
      },
      { id: 'leave', label: 'leave it', effects: [{ log: 'You back away the way you came.' }] },
    ],
  },
  {
    id: 'ridge-light',
    title: 'A light on the ridge',
    when: { phase: ['night'], chapterMin: 3 },
    text: [
      'Far off, on the ridge, a light. It is too yellow for a star and too steady for a fire seen through trees. It might be a lantern. It might be someone looking at yours.',
    ],
    choices: [
      {
        id: 'answer',
        label: 'build your fire up to answer it',
        cost: { wood: 3 },
        effects: [{ fuel: 3 }, { summon: true }, { log: 'You make yourself easy to find. The light on the ridge goes out.' }],
      },
      { id: 'watch', label: 'only watch', effects: [{ log: 'You watch it until it is gone. You do not sleep much.' }] },
    ],
  },
  {
    id: 'ashfall',
    title: 'Heavy ash',
    when: { weather: ['ash'] },
    text: [
      'The ash thickens until it is coming down like the first snow of some other season. It lies on the water, on the food, on the backs of your hands.',
    ],
    choices: [
      {
        id: 'cover',
        label: 'cover the water and the food',
        effects: [{ log: 'You get bark over everything that matters. The ash hisses on the fire.' }],
      },
      {
        id: 'stand',
        label: 'stand in it',
        effects: [
          { take: { water: 2 } },
          { log: 'A flake lands on your palm, and for a moment there is print on it. A column of figures. Then it is dust.', tone: 'memory' },
        ],
      },
    ],
  },
  {
    id: 'small-tracks',
    title: 'Small tracks',
    when: { has: { rations: 3 }, chapterMin: 2 },
    text: [
      'In the morning the food is lighter than it was. There are tracks: small, careful, coming from the trees and going back the same way.',
    ],
    choices: [
      {
        id: 'leave-out',
        label: 'leave a ration out on a stone',
        cost: { rations: 1 },
        effects: [{ summon: true }, { log: 'By evening the stone is bare. Something has been left in its place: a button.' }],
      },
      {
        id: 'guard',
        label: 'move the food closer to the fire',
        effects: [{ take: { rations: 2 } }, { log: 'You count what is gone and move the rest.' }],
      },
    ],
  },
  {
    id: 'song',
    title: 'A tune',
    tone: 'good',
    cast: 'survivor',
    when: { popMin: 3, phase: ['night'], fireMin: 0.5 },
    text: [
      '{name} starts to hum, barely aloud. Somebody else picks up the tune a few notes behind, and then a third, each voice entering after the last, chasing it.',
    ],
    choices: [
      {
        id: 'listen',
        label: 'listen',
        effects: [{ person: { who: 'all', health: 0.06 } }, { log: 'It goes round and round and does not resolve. Nobody wants it to.', tone: 'good' }],
      },
      {
        id: 'join',
        label: 'join in',
        effects: [
          { person: { who: 'all', health: 0.03 } },
          { log: 'Your voice comes out round and practised. A few heads turn. You stop.' },
        ],
      },
    ],
  },
  {
    id: 'drift',
    title: 'Snowed under',
    tone: 'warn',
    when: { weather: ['snow'], coldMin: 0.6 },
    text: [
      'It snows all night. By morning the woodpile is a white hump, and what is underneath is wet through.',
    ],
    choices: [
      {
        id: 'dig',
        label: 'dig it out by hand',
        effects: [{ vital: { warmth: -0.15 } }, { log: 'You dig until your hands stop reporting back.' }],
      },
      {
        id: 'burn',
        label: 'burn what is dry and write off the rest',
        effects: [{ take: { wood: 4 } }, { log: 'A quarter of the pile is too wet to be worth carrying.', tone: 'warn' }],
      },
    ],
  },
  {
    id: 'dog',
    title: 'A dog',
    when: { notFlags: ['dog'], chapterMin: 2 },
    every: 1200,
    text: [
      'A dog, ribs showing, watches from the brush. It has a collar. It looks at the fire the way the people do.',
    ],
    choices: [
      {
        id: 'feed',
        label: 'throw it a piece of meat',
        cost: { meat: 1 },
        effects: [
          { flag: 'dog' },
          { threat: 0 },
          { log: 'It eats, and stays. At night it lies at the edge of the light and growls, once, at the trees.', tone: 'good' },
        ],
      },
      { id: 'shoo', label: 'drive it off', effects: [{ log: 'It goes. It looks back twice.' }] },
    ],
  },
];

/** Every event in the game, keyed by id. */
export const EVENT_BY_ID = indexById([...STORY_EVENTS, ...ARRIVALS, ...INCIDENTS, ...ENCOUNTERS]);
