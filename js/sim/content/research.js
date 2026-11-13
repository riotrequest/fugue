import { indexById } from '../util.js';

/**
 * The notebook: things the camp can work out, one at a time, by thinking them
 * through by the fire and by putting scholars on them (systems/research.js).
 * A finished project counts as a holding (systems/camp.js), so its numeric
 * bonuses are summed with those of buildings and gear; `unlocks` names what it
 * opens up, for the notebook to say so (the gates themselves are `researched`
 * conditions on the buildings, roles and actions concerned).
 *
 * Bonus keys beyond the buildings' own:
 *   mend      share added to how fast survivors heal
 *   burn      share taken off how fast the fire eats its wood
 *   research  share added to the pace of the notebook
 *   pace      { roleId: share } added to how fast that job's workers work
 *
 * @typedef {object} ProjectDef
 * @property {string} id
 * @property {string} title
 * @property {string} text      what it is about, in the notebook's own voice
 * @property {string} done      logged when it is worked out
 * @property {number} work      effort to finish: one unit a second at the base pace
 * @property {Record<string, number>} [cost]  spent when work on it first begins
 * @property {object} [when]    shown in the notebook only once this holds
 * @property {string[]} [needs] projects that must be finished first
 * @property {string[]} [unlocks]  plain words for what it opens up
 * @property {string[]} [flags]    set when it is finished (places on the map, mostly)
 */

/** @type {ProjectDef[]} */
export const PROJECTS = [
  {
    id: 'felling',
    title: 'Where a tree falls',
    text: 'Notch on the side you want it to fall. Watch the lean, the wind, the weight of the crown. Less chopping, fewer near misses.',
    done: 'You have it worked out: notch, back cut, step away. The woodcutters stop arguing about it.',
    work: 200,
    pace: { woodcutter: 0.2 },
    unlocks: ['woodcutters work a fifth faster'],
  },
  {
    id: 'snare-craft',
    title: 'Snare craft',
    text: 'Where the runs are, how high to hang the loop, why the hares avoid fresh-cut wire. Pages of little drawings.',
    done: 'Rub the wire in ash, set the loop a fist above the snow. The snare line starts paying.',
    work: 220,
    when: { built: ['snares'] },
    pace: { trapper: 0.25 },
    unlocks: ['trappers work a quarter faster'],
  },
  {
    id: 'herb-lore',
    title: 'Herb lore',
    text: 'Willow bark for fever, yarrow for bleeding, pine resin for wounds. What you half remember, written down, argued over, tried.',
    done: 'A page of plants you are sure of, and how to make a poultice from them.',
    work: 260,
    when: { popMin: 2 },
    mend: 0.15,
    unlocks: ['brew poultices (medicine) from forage and cloth', 'everyone heals a little faster'],
  },
  {
    id: 'charcoal',
    title: 'Charcoal',
    text: 'Wood burned slowly, starved of air, under turf. It burns hotter, longer, with almost no smoke.',
    done: 'Your first batch of charcoal: black, light, ringing like pottery when you tap it.',
    work: 240,
    when: { chapterMin: 2 },
    unlocks: ['a charcoal kiln'],
  },
  {
    id: 'water-finding',
    title: 'Finding water',
    text: 'Where the reeds grow in the dry months, where the snow melts first, how deep the old people dug. A well would mean no more trips to the creek.',
    done: 'There is water under the low ground by the birches, not far down. You are almost sure.',
    work: 300,
    when: { chapterMin: 2, popMin: 2 },
    unlocks: ['a well'],
  },
  {
    id: 'preserving',
    title: 'Salt and smoke',
    text: 'How long meat keeps smoked, dried, buried in ash. A cellar dug below the frost line would keep anything.',
    done: 'You have the method: thin strips, slow smoke, a cool dark place. Nothing need spoil.',
    work: 280,
    when: { built: ['rack'] },
    pace: { cook: 0.15 },
    unlocks: ['a root cellar', 'the cook works faster'],
  },
  {
    id: 'insulation',
    title: 'Moss and mud',
    text: 'Moss in the gaps, mud over the moss, turf over the mud. And a hut built small and tight, with hot stones, for sweating the cold out.',
    done: 'Every wall in camp is chinked, and the draughts are gone. You know how to build a sweat lodge.',
    work: 320,
    when: { built: ['leanto'], chapterMin: 2 },
    warmth: 0.05,
    shelter: 0.1,
    unlocks: ['the camp holds its warmth better', 'a sweat lodge'],
  },
  {
    id: 'teaching',
    title: 'A school',
    text: 'If everyone knew what each of you knows, the camp would be twice as clever. A roof for an evening school.',
    done: 'A plan for lessons, and for a roof to have them under.',
    work: 300,
    when: { anyOf: [{ flags: ['lessons'] }, { popMin: 5 }] },
    research: 0.3,
    unlocks: ['a schoolhouse', 'the notebook goes faster'],
  },
  {
    id: 'field-medicine',
    title: 'Field medicine',
    text: 'Setting bones, stitching wounds, keeping the sick apart and the water boiled. Someone who did nothing else.',
    done: 'You know enough to keep a sick bay, and to train someone to run it.',
    work: 360,
    needs: ['herb-lore'],
    unlocks: ['an infirmary', 'a medic to work in it'],
  },
  {
    id: 'seed-saving',
    title: 'Seed saving',
    text: 'Which plants to let go to seed, how to dry them, how to start them early under glass or oiled cloth before the frost has gone.',
    done: 'A cold frame, you write, would give you greens a month early and a month late.',
    work: 300,
    when: { anyOf: [{ built: ['garden'] }, { flags: ['neighbours'] }] },
    unlocks: ['a cold frame'],
  },
  {
    id: 'watch-rota',
    title: 'A watch rota',
    text: 'Who watches when, where they stand, what they do when they see something. Signals. Fallback points.',
    done: 'The rota goes up on a board. The guards stop sleeping at their posts, mostly.',
    work: 240,
    when: { chapterMin: 3 },
    watch: 0.3,
    unlocks: ['guards watch a third better'],
  },
  {
    id: 'maps',
    title: 'Maps',
    text: 'Everything you have seen out there, drawn as well as you can, with the walking time between. Gaps where you have not been.',
    done: 'A map of the valley, pinned up by the fire. The gaps on it are interesting.',
    work: 360,
    when: { anyOf: [{ visitsMin: { highway: 1 } }, { visitsMin: { creek: 1 } }, { visitsMin: { suburb: 1 } }] },
    haul: 0.15,
    flags: ['loc-quarry', 'loc-lake', 'loc-farm'],
    unlocks: ['carry home more from the ruins', 'the quarry, the lake and the old farm'],
  },
];

export const PROJECT_BY_ID = indexById(PROJECTS);
