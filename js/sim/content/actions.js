import { indexById } from '../util.js';
import { ACTIONS as PACE } from '../tuning.js';
import { RECIPES } from './recipes.js';
import { BUILDINGS } from './buildings.js';
import { LOCATIONS } from './locations.js';

/**
 * Everything the player can do from the camp. An action is visible while `when`
 * holds, and can be performed when no gate fails, its cost is affordable, its
 * tools are owned and it is not cooling down. What it does is a list of effects
 * (see systems/effects.js).
 *
 * @typedef {object} ActionDef
 * @property {string} id
 * @property {string} group    id of an ACTION_GROUPS entry
 * @property {string} label
 * @property {string} hint
 * @property {Record<string, number>} [cost]   resources spent
 * @property {string[]} [tools]                gear needed but not spent
 * @property {string} [fills]                  resource whose full store blocks the action
 * @property {number} [cooldown]               real seconds before it can be repeated
 * @property {string} [shares]                 cooldown key shared with other actions
 * @property {object} [when]
 * @property {{ when: object, reason: string }[]} [gates]
 * @property {object[]} effects
 */

export const ACTION_GROUPS = [
  { id: 'fire', label: 'the fire' },
  { id: 'forage', label: 'the woods' },
  { id: 'make', label: 'make' },
  { id: 'build', label: 'build' },
  { id: 'venture', label: 'venture' },
  { id: 'self', label: 'yourself' },
];

/** All expeditions share one cooldown: the rest needed after the last one. */
export const VENTURE_COOLDOWN = 'venture';

const NEEDS_FIRE = { when: { fireMin: 0.2 }, reason: 'fire too low' };
const NEEDS_LIGHT = { when: { phase: ['dawn', 'day', 'dusk'] }, reason: 'dark until dawn' };

/** @type {ActionDef[]} */
const CAMP_ACTIONS = [
  {
    id: 'wake',
    group: 'fire',
    label: 'stoke the embers',
    hint: 'it is almost out',
    cost: { wood: 1 },
    when: { awake: false },
    effects: [
      { wake: true },
      { fuel: 1.2 },
      { sfx: 'stoke' },
      { log: 'You open your eyes. You push a stick into the embers and blow until it takes.' },
    ],
  },
  {
    id: 'stoke',
    group: 'fire',
    label: 'stoke the fire',
    hint: 'one piece of wood, a little more light',
    cost: { wood: 1 },
    cooldown: 1.5,
    when: { awake: true, fireLit: true },
    effects: [
      { fuel: 1 },
      { sfx: 'stoke' },
      {
        log: [
          'You feed the fire. It takes the wood.',
          'The flames climb a little.',
          'Bark catches and curls.',
          'You set a branch on the coals. It smokes, then burns.',
          'The fire answers.',
          'Sparks go up. The light widens.',
        ],
      },
    ],
  },
  {
    id: 'relight',
    group: 'fire',
    label: 'relight the fire',
    hint: 'tinder, breath, patience',
    cost: { tinder: 1, wood: 1 },
    cooldown: 2,
    when: { awake: true, fireLit: false },
    effects: [
      { fuel: 1.5 },
      { sfx: 'ignite' },
      {
        log: [
          'A spark, a thread of smoke, a flame the size of a fingernail. It stands up.',
          'The tinder takes. You build it stick by stick.',
          'You shield it with your whole body until it can live on its own.',
        ],
        tone: 'good',
      },
    ],
  },
  {
    id: 'cook',
    group: 'fire',
    label: 'cook meat',
    hint: 'two rations that will keep',
    cost: { meat: 1 },
    fills: 'rations',
    cooldown: 3,
    when: { known: ['meat'] },
    gates: [NEEDS_FIRE],
    effects: [
      // Same as the cook's trade: every cut of meat makes two rations.
      { grant: { rations: 2 } },
      { sfx: 'craft' },
      {
        log: [
          'Fat spits in the fire.',
          'You turn the meat on a green stick until it is dark all through.',
          'The smell of it cooking is almost too much.',
        ],
      },
    ],
  },
  {
    // Worth one ration more than cooking the meat and the forage apart, for a drink of water.
    id: 'stew',
    group: 'fire',
    label: 'cook a stew',
    hint: 'meat, forage and water in the pot: four rations, and a hot bowl for you',
    cost: { meat: 1, forage: 2, water: 1 },
    tools: ['pot'],
    fills: 'rations',
    cooldown: 6,
    when: { known: ['pot'] },
    gates: [NEEDS_FIRE],
    effects: [
      { grant: { rations: 4 } },
      { vital: { warmth: 0.05 } },
      { sfx: 'craft' },
      {
        log: [
          'The pot simmers at the edge of the coals. Everyone finds a reason to sit nearby.',
          'Meat, roots, a handful of something green. It thickens as it cooks.',
          'You eat the first bowl standing up, too hot to taste. The rest goes into the stores.',
        ],
      },
    ],
  },
  {
    id: 'gather-wood',
    group: 'forage',
    label: 'gather wood',
    hint: 'deadfall, from just beyond the light',
    cooldown: 6,
    when: { awake: true },
    effects: [
      {
        yield: [
          // One piece a trip, two with an axe. Winter bites through the fire's appetite, not here.
          { id: 'wood', amount: 1, tool: 'axe', toolFactor: 2 },
          { id: 'tinder', amount: 1, chance: 0.4 },
        ],
      },
      { sfx: 'chop' },
      {
        log: [
          'You drag back an armful of deadfall.',
          'Dry branches snap off clean.',
          'You break up a fallen limb and carry it in.',
          'The wood is damp on top and sound underneath.',
          'You come back with your arms full and your hands numb.',
          'A dead birch gives up its lower branches.',
        ],
      },
    ],
  },
  {
    id: 'fetch-water',
    group: 'forage',
    label: 'fetch water',
    hint: 'the creek is downhill',
    cooldown: 6,
    when: { flags: ['water'] },
    effects: [
      {
        yield: [
          { id: 'water', amount: 2, tool: 'waterskin', toolFactor: 1.5 },
          { id: 'stone', amount: 1, chance: 0.5 },
        ],
      },
      { sfx: 'gather' },
      {
        log: [
          'The creek is fast and cold. You fill what you can carry.',
          'Water so cold it aches in your hands.',
          'You kneel on the stones and fill up.',
          'You carry water uphill and spill less than last time.',
        ],
      },
    ],
  },
  {
    id: 'forage',
    group: 'forage',
    label: 'search the undergrowth',
    hint: 'berries, roots, bark for cord',
    cooldown: 7,
    when: { flags: ['forage'] },
    gates: [NEEDS_LIGHT],
    effects: [
      {
        yield: [
          { id: 'forage', amount: [1, 3], scarce: 1 },
          { id: 'fiber', amount: [1, 2], chance: 0.65 },
          { id: 'stone', amount: 1, chance: 0.3 },
          { id: 'tinder', amount: 1, chance: 0.25 },
        ],
      },
      { sfx: 'gather' },
      {
        log: [
          'You pick through the brambles.',
          'Hard little berries, a few roots.',
          'You strip bark for cord and fill your pockets.',
          'Rosehips, shrivelled but sweet.',
          'Not much. Enough to call it something.',
          'You turn over the leaf litter with a stick and take what is under it.',
        ],
        empty: [
          'The ground is frozen hard. Nothing in it worth eating.',
          'Bark for cord, maybe. Nothing to eat.',
        ],
      },
    ],
  },
  {
    id: 'check-snares',
    group: 'forage',
    label: 'check the snares',
    hint: 'walk the line and reset the loops',
    cooldown: 60,
    when: { built: ['snares'] },
    effects: [{ game: 'snares' }, { sfx: 'gather' }],
  },
  {
    id: 'hunt',
    group: 'forage',
    label: 'hunt',
    hint: 'a long wait and one throw',
    tools: ['spear'],
    cooldown: 90,
    when: { has: { spear: 1 } },
    gates: [NEEDS_LIGHT],
    effects: [
      { game: 'hunt' },
      { sfx: 'gather' },
      {
        roll: 0.12,
        pass: [
          { vital: { health: -0.1 } },
          { log: 'Something turned on you in the brush. You are bleeding.', tone: 'warn' },
        ],
      },
    ],
  },
  {
    id: 'eat',
    group: 'self',
    label: 'eat a ration',
    hint: 'cooked food, enough to work on',
    cost: { rations: 1 },
    cooldown: 1,
    when: { known: ['rations'] },
    gates: [{ when: { vitalMax: { food: 0.9 } }, reason: 'not hungry' }],
    effects: [
      { vital: { food: 0.38 } },
      { sfx: 'eat' },
      {
        log: [
          'You eat. The warmth of it spreads.',
          'Smoke and salt. It is the best thing you have ever tasted.',
          'You eat without tasting it, then wish you had.',
        ],
      },
    ],
  },
  {
    id: 'eat-forage',
    group: 'self',
    label: 'eat what you foraged',
    hint: 'it takes the edge off',
    cost: { forage: 1 },
    cooldown: 1,
    when: { known: ['forage'] },
    gates: [{ when: { vitalMax: { food: 0.9 } }, reason: 'not hungry' }],
    effects: [
      { vital: { food: 0.16 } },
      { sfx: 'eat' },
      {
        log: [
          'Sour berries, and a root that tastes of earth.',
          'You chew slowly to make it last.',
          'It is food. Barely.',
        ],
      },
    ],
  },
  {
    id: 'drink',
    group: 'self',
    label: 'drink',
    hint: 'creek water',
    cost: { water: 1 },
    cooldown: 1,
    when: { known: ['water'] },
    gates: [{ when: { vitalMax: { water: 0.9 } }, reason: 'not thirsty' }],
    effects: [
      { vital: { water: 0.45 } },
      { sfx: 'drink' },
      {
        log: ['Cold water. It tastes of stone.', 'You drink.', 'You drink until your teeth hurt.'],
      },
    ],
  },
  {
    id: 'rest',
    group: 'self',
    label: 'rest by the fire',
    hint: 'let the heat work on you',
    cooldown: 25,
    when: { flags: ['hurt'] },
    gates: [NEEDS_FIRE, { when: { vitalMax: { health: 0.98 } }, reason: 'already rested' }],
    effects: [
      { vital: { health: 0.08, warmth: 0.05 } },
      {
        log: [
          'You sit close and let the heat work on you.',
          'You sleep a little. Nothing comes.',
          'You close your eyes. When you open them the fire has barely changed.',
        ],
      },
    ],
  },
  {
    id: 'treat',
    group: 'self',
    label: 'treat your wounds',
    hint: 'medicine does what rest cannot',
    cost: { medicine: 1 },
    cooldown: 5,
    when: { known: ['medicine'] },
    gates: [{ when: { vitalMax: { health: 0.9 } }, reason: 'not hurt enough' }],
    effects: [
      { vital: { health: 0.4 } },
      { log: 'You clean it, bind it, and swallow two of the white tablets. It will hold.', tone: 'good' },
    ],
  },
  {
    id: 'nurse',
    group: 'self',
    label: 'tend the sick',
    hint: 'medicine for whoever is worst; enough to get most back on their feet',
    cost: { medicine: 1 },
    cooldown: 5,
    when: { known: ['medicine'], sickMin: 1 },
    effects: [
      { person: { who: 'sickest', health: 0.4 } },
      {
        log: [
          'You sit {name} up and get two tablets and some water into them.',
          '{name} takes the medicine without opening their eyes. By evening the fever has broken.',
        ],
        tone: 'good',
      },
    ],
  },
];

/** The two ways out that the player chooses. @type {ActionDef[]} */
const CODA_ACTIONS = [
  {
    id: 'beacon',
    group: 'venture',
    label: 'go to the mast',
    hint: 'the key is wired and waiting',
    when: { built: ['radio'], notFlags: ['beacon'] },
    effects: [{ next: 'beacon' }],
  },
  {
    id: 'leave',
    group: 'venture',
    label: 'walk away from the fire',
    hint: 'east, and alone',
    when: { flags: ['may-leave'] },
    effects: [{ next: 'leave' }],
  },
];

/** @param {import('./recipes.js').RecipeDef} recipe @returns {ActionDef} */
const craftAction = (recipe) => ({
  id: `make-${recipe.id}`,
  group: 'make',
  label: recipe.label,
  hint: recipe.hint,
  cost: recipe.cost,
  tools: recipe.tools,
  fills: recipe.id,
  cooldown: PACE.craftSeconds,
  when: recipe.repeatable ? recipe.when : { ...recipe.when, lacks: [recipe.id] },
  effects: [{ grant: { [recipe.id]: 1 } }, { sfx: 'craft' }, { log: recipe.done, tone: 'good' }],
});

/** @param {import('./buildings.js').BuildingDef} building @returns {ActionDef} */
const buildAction = (building) => ({
  id: `build-${building.id}`,
  group: 'build',
  label: building.label,
  hint: building.hint,
  cost: building.cost,
  cooldown: PACE.buildSeconds,
  when: { ...building.when, unbuilt: [building.id] },
  gates: building.gates,
  effects: [{ build: building.id }],
});

/** @param {import('./locations.js').LocationDef} location @returns {ActionDef} */
const ventureAction = (location) => ({
  id: `go-${location.id}`,
  group: 'venture',
  label: location.label,
  hint: location.hint,
  cost: location.cost,
  shares: VENTURE_COOLDOWN,
  when: { flags: [`loc-${location.id}`] },
  gates: [
    { when: { phase: ['dawn', 'day'] }, reason: 'too late to set out' },
    { when: { vitalMin: { health: 0.35 } }, reason: 'too weak to travel' },
  ],
  effects: [{ venture: location.id }],
});

/** Every action, in display order within its group. @type {ActionDef[]} */
export const ACTION_DEFS = [
  ...CAMP_ACTIONS,
  ...RECIPES.map(craftAction),
  ...BUILDINGS.map(buildAction),
  ...LOCATIONS.map(ventureAction),
  ...CODA_ACTIONS,
];

export const ACTION_BY_ID = indexById(ACTION_DEFS);
