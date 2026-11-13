import { indexById } from '../util.js';
import { SEASON } from '../tuning.js';

/**
 * Structures raised at the camp. Ids are shared with the renderer and must not change.
 * Numeric bonuses are summed across everything built (see systems/camp.js).
 *
 * @typedef {object} BuildingDef
 * @property {string} id
 * @property {string} label    action label
 * @property {string} hint
 * @property {Record<string, number>} cost
 * @property {object} [when]   condition for the plan to be known
 * @property {{ when: object, reason: string }[]} [gates]  conditions to start building
 * @property {string} done     log line on completion
 * @property {number} [beds]     survivors it can house
 * @property {number} [warmth]   added to the comfort level of the camp
 * @property {number} [shelter]  share of rain and snow kept off the fire
 * @property {number} [ward]     share of the night's threat it turns away
 * @property {number} [watch]    added to every guard's effectiveness
 * @property {number} [smoke]    added to the cook's working speed
 * @property {Record<string, number>} [caps]  storage it adds
 * @property {{ id: string, period: number, when: object }} [grows]  passive produce
 */

/** @type {BuildingDef[]} */
export const BUILDINGS = [
  {
    id: 'leanto',
    label: 'raise a lean-to',
    hint: 'a roof for two more, and for the fire in rain',
    cost: { wood: 8, fiber: 4 },
    when: { chapterMin: 2 },
    done: 'Branches against a ridgepole, bark over the branches. It is a roof.',
    beds: 2,
    warmth: 0.08,
    shelter: 0.4,
  },
  {
    id: 'rack',
    label: 'build a drying rack',
    hint: 'someone can cook and keep food here',
    cost: { wood: 6, fiber: 3 },
    when: { built: ['leanto'] },
    done: 'A frame of green poles over the smoke. Food will keep on it.',
    caps: { rations: 10 },
  },
  {
    id: 'raincatcher',
    label: 'rig a rain catcher',
    hint: 'rain and snow fill it; holds more water',
    cost: { wood: 4, fiber: 3 },
    when: { built: ['leanto'] },
    done: 'Bark troughs run down to a hollowed log. Now you wait for weather.',
    caps: { water: 8 },
  },
  {
    id: 'shed',
    label: 'build a store shed',
    hint: 'room for more wood, stone, cord and hide',
    cost: { wood: 12, stone: 4, fiber: 4 },
    when: { built: ['leanto'] },
    done: 'Four posts, a bark roof, a floor of split logs off the wet ground. Everything has a place.',
    caps: { wood: 20, stone: 10, fiber: 10, hide: 5 },
  },
  {
    id: 'snares',
    label: 'set a snare line',
    hint: 'meat, if something walks into it',
    cost: { wood: 3, fiber: 5 },
    when: { built: ['leanto'] },
    done: 'Six loops of cord along the game trail, each bent to a sapling.',
  },
  {
    id: 'workbench',
    label: 'build a workbench',
    hint: 'a place for bigger work',
    cost: { wood: 10, stone: 6 },
    when: { built: ['leanto', 'snares'] },
    done: 'A split log on stone legs. You can think of a dozen things to make on it.',
    caps: { wood: 20 },
  },
  {
    id: 'garden',
    label: 'dig a garden',
    hint: 'slow food, until the frost',
    cost: { wood: 6, fiber: 4, forage: 6 },
    when: { built: ['workbench'], chapterMin: 3 },
    gates: [{ when: { coldMax: 0.5 }, reason: 'ground too hard' }],
    done: 'You fence a patch of turned earth and press roots into it with your thumb.',
    grows: { id: 'forage', period: 40, when: { coldMax: SEASON.frostCold } },
  },
  {
    id: 'cabin',
    label: 'raise a cabin',
    hint: 'walls; room for four more',
    cost: { wood: 40, stone: 8, fiber: 8 },
    when: { built: ['workbench'], chapterMin: 3 },
    done: 'Four walls, chinked with moss and mud. Inside, the wind stops.',
    beds: 4,
    warmth: 0.2,
    caps: { wood: 20 },
  },
  {
    id: 'bunkhouse',
    label: 'raise a bunkhouse',
    hint: 'bunks for four more; the camp can grow no bigger',
    cost: { wood: 45, stone: 10, fiber: 8, hide: 4 },
    when: { built: ['cabin'] },
    done: 'A long low house of logs with a bark roof, bunks two high down both walls. It smells of pine sap and wet wool.',
    beds: 4,
    warmth: 0.05,
  },
  {
    id: 'palisade',
    label: 'drive a palisade',
    hint: 'sharpened stakes between you and the trees',
    cost: { wood: 35, scrap: 4 },
    when: { built: ['workbench'], chapterMin: 3 },
    done: 'A ring of stakes, points outward. The dark is the same. It is further away.',
    ward: 0.5,
    shelter: 0.2,
  },
  {
    id: 'smokehouse',
    label: 'build a smokehouse',
    hint: 'food cures faster and keeps through winter',
    cost: { wood: 20, stone: 10, scrap: 3 },
    when: { built: ['rack', 'workbench'], chapterMin: 3 },
    done: 'Stone to the knee, timber above, a sheet of tin for a door.',
    smoke: 1,
    caps: { rations: 30 },
  },
  {
    id: 'watchtower',
    label: 'raise a watchtower',
    hint: 'guards see twice as far; room for one more',
    cost: { wood: 25, scrap: 5, wire: 2 },
    when: { built: ['palisade'] },
    done: 'A platform lashed in the fork of the tallest pine. From it you can see the ridge.',
    watch: 1,
    beds: 1,
  },
  {
    id: 'radio',
    label: 'raise the radio mast',
    hint: 'a voice that carries past the hills',
    cost: { wood: 15, scrap: 8, wire: 4, parts: 3, batteries: 2 },
    when: { built: ['workbench'], flags: ['radio-idea'] },
    done: 'The mast goes up a little crooked. Wire sings in the wind.',
  },
];

export const BUILDING_BY_ID = indexById(BUILDINGS);
