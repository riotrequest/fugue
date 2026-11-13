/**
 * Decisions about people: quarrels, favours, confessions, a challenge to whose
 * fire this is. They join the incident pool (content/events.js) and are drawn
 * the same way, but most turn on trust and bonds rather than on food and fire,
 * and their casts come from systems/modal.js (pairs, rivals, the wary).
 *
 * @typedef {import('./events.js').EventDef} EventDef
 */

/** @type {EventDef[]} */
export const DECISIONS = [
  {
    id: 'dispute-rations',
    title: 'Who ate it',
    tone: 'warn',
    cast: 'pair',
    when: { popMin: 3 },
    every: 1500,
    text: [
      '{name} says the ration set aside for them has gone, and looks straight at {other} while saying it.',
      '{other} says nothing at all, which is its own kind of answer, or none.',
    ],
    choices: [
      {
        id: 'back-name',
        label: 'take {name}’s side',
        effects: [
          { bond: 'rival' },
          { trust: { who: 'cast', delta: 0.08 } },
          { trust: { who: 'other', delta: -0.12 } },
          { log: '{other} hears you out, nods once, and goes to sleep with their back to the fire.' },
        ],
      },
      {
        id: 'replace',
        label: 'replace it from the stores',
        cost: { rations: 1 },
        effects: [
          { trust: { who: 'pair', delta: 0.04 } },
          { log: 'You hand {name} another ration. Nobody is accused. It costs a meal, and buys a quiet night.' },
        ],
      },
      {
        id: 'sort-it',
        label: 'tell them to sort it out',
        effects: [
          {
            roll: 0.5,
            pass: [{ bond: 'friend' }, { log: 'They argue, then talk, then laugh. It was a dog, or a fox. They agree on the fox.', tone: 'good' }],
            fail: [{ bond: 'rival' }, { log: 'They do not sort it out. They will not be sorting it out for some time.', tone: 'warn' }],
          },
        ],
      },
    ],
  },
  {
    id: 'rivals-come-to-blows',
    title: 'Blows',
    tone: 'danger',
    cast: 'rivals',
    when: { popMin: 2 },
    every: 1800,
    text: [
      'It finally happens at the woodpile. {name} and {other} are on the ground in the snow and wood chips, and nobody is pulling them apart.',
    ],
    choices: [
      {
        id: 'pull-apart',
        label: 'pull them apart yourself',
        effects: [
          { vital: { health: -0.05 } },
          { trust: { who: 'pair', delta: 0.05 } },
          { log: 'Somebody’s elbow catches you in the mouth. But they stop, both of them, and look at you bleeding, and are ashamed.' },
        ],
      },
      {
        id: 'make-them-work',
        label: 'set them one job, together',
        effects: [
          {
            roll: 0.45,
            pass: [{ bond: null }, { log: 'An afternoon on the two-man saw. By evening they are not friends, but they are not enemies either.', tone: 'good' }],
            fail: [{ person: { who: 'other', health: -0.1, cause: 'wounds' } }, { log: 'The saw does not help. {other} comes back with a cut that needs binding.', tone: 'warn' }],
          },
        ],
      },
      {
        id: 'send-one-away',
        label: 'send {name} away',
        effects: [{ exile: 'cast' }, { trust: { who: 'other', delta: 0.1 } }],
      },
    ],
  },
  {
    id: 'a-confession',
    title: 'Something to tell you',
    cast: 'loyal',
    when: { popMin: 2 },
    every: 3000,
    text: [
      '{name} waits until the others are asleep before speaking.',
      '“Before I came here, I left people. People who needed me. I keep thinking you should know that about me.”',
    ],
    choices: [
      {
        id: 'absolve',
        label: '“We all left someone.”',
        effects: [{ trust: { who: 'cast', delta: 0.1 } }, { log: '{name} lets out a breath that seems to have been held for months.', tone: 'good' }],
      },
      {
        id: 'listen',
        label: 'just listen',
        effects: [{ trust: { who: 'cast', delta: 0.06 } }, { log: 'You say nothing. That turns out to be what was needed.' }],
      },
      {
        id: 'judge',
        label: '“Will you leave us too?”',
        effects: [{ trust: { who: 'cast', delta: -0.2 } }, { log: '{name} looks at you a long while. “I suppose we will find out,” they say.', tone: 'warn' }],
      },
    ],
  },
  {
    id: 'leadership-challenge',
    title: 'Whose fire',
    tone: 'danger',
    cast: 'wary',
    when: { popMin: 4 },
    every: 2400,
    text: [
      '{name} stands up at supper, in front of everyone. “Who decided it was this one who decides?” they say, pointing at you with their spoon.',
      'Nobody laughs. Some of them are waiting to see what you do.',
    ],
    choices: [
      {
        id: 'stand-firm',
        label: '“I lit it.”',
        effects: [
          {
            roll: 0.55,
            pass: [{ trust: { who: 'all', delta: 0.04 } }, { trust: { who: 'cast', delta: -0.05 } }, { log: 'That is enough for most of them. {name} sits down, slowly, and eats.' }],
            fail: [{ trust: { who: 'all', delta: -0.06 } }, { log: 'It is not enough. The talk goes on long after you have gone to your blanket.', tone: 'warn' }],
          },
        ],
      },
      {
        id: 'share-say',
        label: '“Then we decide together.”',
        effects: [
          { trust: { who: 'all', delta: 0.05 } },
          { trust: { who: 'cast', delta: 0.15 } },
          { flag: 'council' },
          { record: 'The camp began to decide things together.' },
          { log: 'From now on, the bigger questions are talked through at supper. It is slower. {name} seems almost disappointed.', tone: 'good' },
        ],
      },
      {
        id: 'cast-out',
        label: 'drive {name} out',
        effects: [{ trust: { who: 'all', delta: -0.04 } }, { exile: 'cast' }],
      },
    ],
  },
  {
    id: 'work-stoppage',
    title: 'Down tools',
    tone: 'warn',
    cast: 'wary',
    when: { popMin: 3, anyOf: [{ vitalMax: { food: 0.35 } }, { lacks: ['rations'] }, { coldMin: 0.6 }] },
    every: 1800,
    text: [
      '{name} drops the axe on the woodpile. “I’m not breaking my back for a camp that can’t feed me,” they say, loud enough for everyone.',
      'Two others have stopped work to watch.',
    ],
    choices: [
      {
        id: 'feed-first',
        label: 'feed them, first, now',
        cost: { rations: 2 },
        effects: [{ trust: { who: 'cast', delta: 0.15 } }, { log: '{name} eats standing up. Then picks up the axe.' }],
      },
      {
        id: 'let-rest',
        label: 'let them rest a day',
        effects: [{ idle: 'cast' }, { trust: { who: 'cast', delta: 0.08 } }, { log: '{name} sits down by the fire, the job left undone.' }],
      },
      {
        id: 'order',
        label: 'order them back to work',
        effects: [
          {
            roll: 0.4,
            pass: [{ log: '{name} picks the axe back up, and swings it harder than it needs.' }],
            fail: [{ idle: 'cast' }, { trust: { who: 'cast', delta: -0.12 } }, { log: '{name} walks off into the trees and does not come back until dark.', tone: 'warn' }],
          },
        ],
      },
    ],
  },
  {
    id: 'courtship',
    title: 'Two at the edge of the light',
    cast: 'friends',
    when: { popMin: 2 },
    every: 4000,
    text: [
      'You notice that {name} and {other} have taken to doing the night’s last water run together, and that it takes them a very long time.',
    ],
    choices: [
      {
        id: 'bless',
        label: 'give them the lean-to corner',
        when: { built: ['leanto'] },
        effects: [
          { bond: 'partner' },
          { trust: { who: 'pair', delta: 0.1 } },
          { record: '{name} and {other} made a home together at the fire.' },
          { log: 'Somebody hangs a blanket across the corner. Everyone pretends very hard that nothing has changed.', tone: 'good' },
        ],
      },
      {
        id: 'smile',
        label: 'say nothing, and smile',
        effects: [{ bond: 'partner' }, { record: '{name} and {other} made a home together at the fire.' }, { log: 'The water runs go on taking a very long time.', tone: 'good' }],
      },
      {
        id: 'warn',
        label: 'warn them it will make trouble',
        effects: [{ trust: { who: 'pair', delta: -0.06 } }, { log: 'They nod. They go on doing the water run together anyway.' }],
      },
    ],
  },
  {
    id: 'a-favour',
    title: 'A favour',
    cast: 'survivor',
    when: { popMin: 1, has: { cloth: 2 } },
    every: 2400,
    text: [
      '{name} asks, not looking at you, whether they might have some of the cloth. Their feet have been wrapped in the same rags since before they came.',
    ],
    choices: [
      {
        id: 'give',
        label: 'give them the cloth',
        cost: { cloth: 2 },
        effects: [{ trust: { who: 'cast', delta: 0.12 } }, { person: { who: 'cast', health: 0.05 } }, { log: '{name} wraps their feet properly for the first time in weeks and says thank you three times.', tone: 'good' }],
      },
      {
        id: 'refuse',
        label: '“We need it for the camp.”',
        effects: [{ trust: { who: 'cast', delta: -0.06 } }, { log: '{name} nods as if they had expected nothing else.' }],
      },
    ],
  },
  {
    id: 'grief-night',
    title: 'Grief',
    cast: 'mourner',
    when: { deadMin: 1, phase: ['night'] },
    every: 3600,
    text: [
      '{name} cannot sleep. They sit up with you at the fire and talk about {lost}: small things, how they took their tea, what they were afraid of.',
    ],
    choices: [
      {
        id: 'stay-up',
        label: 'stay up with them',
        effects: [{ vital: { warmth: -0.05 } }, { trust: { who: 'cast', delta: 0.1 } }, { log: 'Dawn finds you both still there, the fire fed and the talk run out.', tone: 'good' }],
      },
      {
        id: 'marker',
        label: 'make a marker together',
        cost: { wood: 2 },
        effects: [{ trust: { who: 'all', delta: 0.03 } }, { record: 'A marker was raised for {lost}.' }, { log: 'A cross of split pine, with {lost} cut into it. It is crooked. It will do.' }],
      },
      {
        id: 'sleep',
        label: 'tell them to get some sleep',
        effects: [{ log: '{name} goes, and lies awake anyway.' }],
      },
    ],
  },
  {
    id: 'hoarder',
    title: 'Under the blanket',
    tone: 'warn',
    cast: 'survivor',
    when: { popMin: 3 },
    every: 2400,
    text: [
      'Rolling up {name}’s blanket to air it, someone finds four rations wrapped in a sock.',
      '{name} goes very still. “In case,” they say. “Just in case.”',
    ],
    choices: [
      {
        id: 'let-keep',
        label: 'let them keep one',
        effects: [{ grant: { rations: 3 } }, { trust: { who: 'cast', delta: 0.06 } }, { log: 'Three go back to the stores. One goes back in the sock. {name} cannot look at anyone.' }],
      },
      {
        id: 'back-to-stores',
        label: 'all of it, back to the stores',
        effects: [{ grant: { rations: 4 } }, { trust: { who: 'cast', delta: -0.08 } }, { log: 'The rations go back. {name} goes to bed without supper, by their own choice.' }],
      },
      {
        id: 'public',
        label: 'make an example of them',
        effects: [{ grant: { rations: 4 } }, { trust: { who: 'cast', delta: -0.25 } }, { trust: { who: 'all', delta: -0.02 } }, { log: 'You say it in front of everyone. It works: nobody hides food after that. Nobody quite trusts you after that either.', tone: 'warn' }],
      },
    ],
  },
  {
    id: 'skill-shown',
    title: 'Something they knew',
    tone: 'good',
    cast: 'worker',
    when: { popMin: 2 },
    every: 3000,
    text: [
      '{name} watches someone struggle with a knot for a full minute, then takes it off them and ties it in a single movement.',
      '“My father had boats,” they say, as if that explained everything. It does, more or less.',
    ],
    choices: [
      {
        id: 'teach',
        label: 'ask them to teach the others',
        effects: [{ trust: { who: 'cast', delta: 0.08 } }, { grant: { fiber: 3 } }, { log: 'An evening of knots. The camp’s lashings hold better after it.', tone: 'good' }],
      },
      {
        id: 'nod',
        label: 'nod your thanks',
        effects: [{ trust: { who: 'cast', delta: 0.03 } }],
      },
    ],
  },
  {
    id: 'who-goes-out',
    title: 'Too few to send',
    cast: 'survivor',
    when: { popMin: 2, weather: ['snow', 'rain'] },
    every: 2400,
    text: [
      'The snares need checking and the weather is foul. {name} says it should be somebody else’s turn. Everybody else says the same.',
    ],
    choices: [
      {
        id: 'go-yourself',
        label: 'go yourself',
        effects: [{ vital: { warmth: -0.12 } }, { trust: { who: 'all', delta: 0.04 } }, { grant: { meat: [0, 2] } }, { log: 'You come back soaked. Nobody says anything, but the best place at the fire is left empty for you.' }],
      },
      {
        id: 'send-name',
        label: 'send {name}',
        effects: [{ trust: { who: 'cast', delta: -0.05 } }, { grant: { meat: [0, 2] } }, { log: '{name} goes, and comes back, and does not speak to you all evening.' }],
      },
      {
        id: 'leave-them',
        label: 'leave the snares a day',
        effects: [{ log: 'The snares wait. Whatever was in them will not be by tomorrow.' }],
      },
    ],
  },
  {
    id: 'sick-visit',
    title: 'Bedside',
    cast: 'sick',
    every: 1800,
    text: [
      '{name} is awake and asking for you. They want to know whether they are going to be left behind if the camp has to move.',
    ],
    choices: [
      {
        id: 'promise',
        label: '“Nobody gets left.”',
        effects: [{ trust: { who: 'cast', delta: 0.12 } }, { trust: { who: 'all', delta: 0.02 } }, { log: '{name} closes their eyes. The others heard it too.', tone: 'good' }],
      },
      {
        id: 'medicine',
        label: 'give them medicine',
        cost: { medicine: 1 },
        effects: [{ person: { who: 'cast', health: 0.3 } }, { trust: { who: 'cast', delta: 0.12 } }, { log: 'You do not answer the question. You give them the medicine. It is an answer.', tone: 'good' }],
      },
      {
        id: 'honest',
        label: '“I don’t know.”',
        effects: [{ trust: { who: 'cast', delta: -0.04 } }, { log: '{name} thanks you for the truth, and turns their face to the wall.' }],
      },
    ],
  },
  {
    id: 'birthday',
    title: 'A birthday',
    tone: 'good',
    cast: 'survivor',
    when: { popMin: 3 },
    every: 5000,
    text: [
      'Someone has worked out from the scratches on the lean-to post that today is {name}’s birthday. {name} pretends not to care, badly.',
    ],
    choices: [
      {
        id: 'feast',
        label: 'a small feast',
        cost: { rations: 3 },
        effects: [{ trust: { who: 'all', delta: 0.05 } }, { trust: { who: 'cast', delta: 0.08 } }, { person: { who: 'all', health: 0.04 } }, { log: 'Extra rations and a candle stub stuck in a heel of bread. Somebody sings, terribly. {name} cries a little.', tone: 'good' }],
      },
      {
        id: 'song',
        label: 'just a song',
        effects: [{ trust: { who: 'cast', delta: 0.05 } }, { log: 'A song, out of tune and too slow. {name} says it was the best one they ever had.' }],
      },
    ],
  },
  {
    id: 'deserter-plan',
    title: 'Overheard',
    tone: 'warn',
    cast: 'wary',
    when: { popMin: 3 },
    every: 3000,
    text: [
      'Gathering wood, you hear {name} on the other side of the thicket, low-voiced: they mean to slip away tonight, and take a share of the stores as their due.',
    ],
    choices: [
      {
        id: 'confront',
        label: 'step out and talk to them',
        effects: [
          {
            roll: 0.5,
            pass: [{ trust: { who: 'cast', delta: 0.2 } }, { log: 'You talk for an hour on a frozen log. {name} stays. You are not entirely sure why.', tone: 'good' }],
            fail: [{ depart: 'cast' }],
          },
        ],
      },
      {
        id: 'guard-stores',
        label: 'sleep beside the stores',
        effects: [{ vital: { warmth: -0.06 } }, { depart: 'cast' }, { log: 'The stores are all there in the morning. {name} is not.' }],
      },
      {
        id: 'let-go',
        label: 'let them go, and take their share',
        effects: [{ take: { rations: 2 } }, { depart: 'cast' }],
      },
    ],
  },
  {
    id: 'peacemaker',
    title: 'Peacemaker',
    cast: 'rivals',
    when: { loyalMin: 1, popMin: 3 },
    every: 3000,
    text: [
      'One of the others comes to you about {name} and {other}. “It’s poisoning the whole camp,” they say. “Somebody has to do something.”',
    ],
    choices: [
      {
        id: 'sit-down',
        label: 'sit the two of them down',
        effects: [
          {
            roll: 0.6,
            pass: [{ bond: null }, { trust: { who: 'pair', delta: 0.05 } }, { log: 'Hours of it. In the end it was about a pair of boots, months ago. They shake on it.', tone: 'good' }],
            fail: [{ trust: { who: 'pair', delta: -0.05 } }, { log: 'It goes nowhere. Each of them thinks you took the other’s side.', tone: 'warn' }],
          },
        ],
      },
      {
        id: 'separate',
        label: 'give them different shifts',
        effects: [{ idle: 'other' }, { log: 'You put {other} on nights. The camp is quieter. {other} is not pleased.' }],
      },
    ],
  },
  {
    id: 'stranger-child',
    title: 'Small footprints',
    tone: 'warn',
    when: { popMin: 2, phase: ['dawn', 'day'], room: true },
    every: 6000,
    text: [
      'Small bare footprints in the frost around the stores. Something has been taken: half a ration, nothing more. Whoever it was is very light, and very hungry.',
    ],
    choices: [
      {
        id: 'leave-food',
        label: 'leave food out tonight',
        cost: { rations: 1 },
        effects: [{ summon: true }, { log: 'You leave a ration on a flat stone at the edge of the light, and keep the fire high.' }],
      },
      {
        id: 'set-watch',
        label: 'set a watch to catch them',
        effects: [{ log: 'Nobody comes. Whoever it was has learned to be careful.' }],
      },
    ],
  },
  {
    id: 'oath',
    title: 'An oath',
    tone: 'good',
    when: { popMin: 5, loyalMin: 3 },
    every: 99999,
    text: [
      'Somebody suggests, half joking, that the camp ought to have a rule or two, written down. By the end of the evening it is not a joke.',
      'Three rules, cut into a board: nobody eats before the sick. Nobody leaves without saying. The fire is everybody’s.',
    ],
    choices: [
      {
        id: 'carve',
        label: 'cut the board and hang it up',
        cost: { wood: 2 },
        effects: [
          { trust: { who: 'all', delta: 0.08 } },
          { flag: 'oath' },
          { record: 'The camp cut its three rules into a board and hung it by the fire.' },
          { log: 'The board hangs by the fire. People touch it as they pass, without seeming to notice.', tone: 'good' },
        ],
      },
      {
        id: 'unwritten',
        label: '“Better left unwritten.”',
        effects: [{ log: 'The rules stay rules anyway. Nobody needs a board to remember them.' }],
      },
    ],
  },
];

/** Someone who walked out of the camp, back at the edge of the light. Joins the arrivals. */
export const RETURNS = [
  {
    id: 'arrival-return',
    title: 'A face you know',
    cast: 'returning',
    weight: 0.8,
    text: [
      'A figure stands at the edge of the light a long while before coming in. It is {name}, thinner than when they left.',
      '“I thought there would be something better out there,” they say. “There wasn’t.”',
    ],
    choices: [
      {
        id: 'welcome',
        label: 'let them back in',
        effects: [
          { rejoin: true },
          { sfx: 'arrive' },
          { trust: { who: 'all', delta: 0.02 } },
          { log: '{name} sits down in their old place as if they had only gone for water.', tone: 'good' },
        ],
      },
      {
        id: 'refuse',
        label: '“You made your choice.”',
        effects: [{ rejoin: false }, { log: '{name} nods, and goes, and this time you know they will not be back.' }],
      },
    ],
  },
];
