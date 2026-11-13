import { indexById } from '../util.js';

/**
 * Work survivors can be set to. One worker completes one turn of a role every
 * `period` seconds; a turn rolls `yields`, applies the first affordable entry of
 * `converts`, or tends the fire. Guards have no turns: they slow the night's threat.
 *
 * @typedef {object} RoleDef
 * @property {string} id
 * @property {string} label
 * @property {string} hint
 * @property {string} vacant    logged when the last worker in the role is lost
 * @property {number|null} max      most survivors the role can use
 * @property {object} [when]        condition for the role to exist
 * @property {number} [period]      seconds per turn for one worker
 * @property {boolean} [outdoors]   stops at night
 * @property {boolean} [dayShift]   works indoors, but also stops at night
 * @property {'working'|'away'|'standing'} pose  how the renderer shows a worker on shift
 * @property {import('../systems/yields.js').YieldDef[]} [yields]
 * @property {{ id: string, label: string, required?: boolean }} [tool]  gear each worker uses: one per
 *                                  worker speeds them up, or with `required`, no one takes the job without one
 * @property {string} [game]        a GAME_GROUNDS key: each turn tries for an animal
 * @property {{ from: Record<string, number>, to: Record<string, number>, when?: object }[]} [converts]
 *                                  the first one affordable (and whose `when` holds) is made each turn
 * @property {string} [hasten]      camp bonus that speeds the role up
 * @property {boolean} [tends]
 * @property {boolean} [guards]
 * @property {boolean} [studies]    adds to the notebook's pace instead of taking turns
 */

/** @type {RoleDef[]} */
export const ROLES = [
  {
    id: 'tender',
    label: 'fire keeper',
    hint: 'feeds the fire from the woodpile',
    vacant: 'No one is keeping the fire now.',
    max: 1,
    period: 4,
    pose: 'working',
    tends: true,
  },
  {
    id: 'woodcutter',
    label: 'woodcutter',
    hint: 'brings in wood by daylight; half again as much with an axe each',
    vacant: 'No one is cutting wood now.',
    max: null,
    period: 14,
    outdoors: true,
    pose: 'working',
    tool: { id: 'axe', label: 'axes' },
    yields: [{ id: 'wood', amount: 1, tool: 'axe', toolFactor: 1.5 }],
  },
  {
    id: 'carrier',
    label: 'water carrier',
    hint: 'walks to the creek and back; half again as much with a water skin each',
    vacant: 'No one is carrying water now.',
    max: null,
    period: 12,
    outdoors: true,
    pose: 'away',
    tool: { id: 'waterskin', label: 'skins' },
    yields: [{ id: 'water', amount: 1, tool: 'waterskin', toolFactor: 1.5 }],
  },
  {
    id: 'forager',
    label: 'forager',
    hint: 'finds less as the cold deepens',
    vacant: 'No one is foraging now.',
    max: null,
    period: 16,
    outdoors: true,
    pose: 'away',
    yields: [
      { id: 'forage', amount: 1, scarce: 1 },
      { id: 'fiber', amount: 1, chance: 0.3 },
      { id: 'tinder', amount: 1, chance: 0.15 },
      { id: 'stone', amount: 1, chance: 0.2 },
    ],
  },
  {
    id: 'trapper',
    label: 'trapper',
    hint: 'walks the snare line; a knife each means more hides',
    vacant: 'No one is walking the snare line now.',
    max: 3,
    when: { built: ['snares'] },
    period: 26,
    outdoors: true,
    pose: 'away',
    tool: { id: 'knife', label: 'knives' },
    game: 'snares',
  },
  {
    // Slower than the snares but brings back more at once, and more hide.
    id: 'hunter',
    label: 'hunter',
    hint: 'rabbits, birds, now and then a deer; each hunter needs a spear',
    vacant: 'No one is out hunting now.',
    max: 2,
    when: { has: { spear: 1 } },
    period: 45,
    outdoors: true,
    pose: 'away',
    tool: { id: 'spear', label: 'spears', required: true },
    game: 'hunt',
  },
  {
    id: 'cook',
    label: 'cook',
    hint: 'cooks by day: stew when there is a pot and the makings, else two rations from every cut of meat',
    vacant: 'No one is cooking now.',
    max: 1,
    when: { built: ['rack'] },
    period: 10,
    pose: 'working',
    dayShift: true,
    hasten: 'smoke',
    converts: [
      // Stew whenever there is a pot and the makings; plain cooked meat otherwise.
      { from: { meat: 1, forage: 2, water: 1 }, to: { rations: 4 }, when: { has: { pot: 1 } } },
      { from: { meat: 1 }, to: { rations: 2 } },
      { from: { forage: 2 }, to: { rations: 1 } },
    ],
  },
  {
    // Studies have no turns: scholars add to the notebook's pace (systems/research.js).
    id: 'scholar',
    label: 'scholar',
    hint: 'works on the notebook by day',
    vacant: 'No one is working on the notebook now.',
    max: 2,
    when: { flags: ['notebook'], popMin: 3 },
    pose: 'working',
    dayShift: true,
    studies: true,
  },
  {
    // Medics heal the sick faster (systems/people.js) and, with herb lore, brew medicine.
    id: 'medic',
    label: 'medic',
    hint: 'tends the sick; brews medicine from forage and cloth once herbs are known',
    vacant: 'No one is tending the sick now.',
    max: 2,
    when: { built: ['infirmary'] },
    period: 60,
    pose: 'working',
    dayShift: true,
    converts: [{ from: { forage: 3, cloth: 1 }, to: { medicine: 1 }, when: { researched: ['herb-lore'] } }],
  },
  {
    id: 'guard',
    label: 'guard',
    hint: 'watches the tree line at night',
    vacant: 'No one is watching the tree line now.',
    max: null,
    when: { chapterMin: 3 },
    pose: 'standing',
    guards: true,
  },
];

export const ROLE_BY_ID = indexById(ROLES);
