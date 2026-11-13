import { indexById } from '../util.js';

/**
 * Places beyond the firelight. A trip costs supplies up front, plays a few
 * encounters drawn from `encounters`, then the first memory scene the player is
 * ready for, and takes `days` of camp time during which the fire is on its own.
 *
 * @typedef {object} LocationDef
 * @property {string} id
 * @property {string} label        action label
 * @property {string} hint
 * @property {Record<string, number>} cost
 * @property {number} days         time away, in days
 * @property {string} depart       log line on setting out
 * @property {string[]} encounters event ids (see encounters.js)
 * @property {{ memory: string, event: string, when?: object }[]} scenes  in story order
 * @property {{ flag: string, log: string }[]} [finds]  what the first trip reveals
 * @property {{ event: string, chain: string, when?: object }[]} [requests]  errands a survivor
 *                                 asked for: the event joins the trip, about that chain's person
 */

/** @type {LocationDef[]} */
export const LOCATIONS = [
  {
    id: 'creek',
    label: 'follow the creek',
    hint: 'an hour or two downstream',
    cost: { forage: 2, water: 1 },
    days: 0.15,
    depart: 'You follow the creek down through the alders.',
    encounters: ['creek-pool', 'creek-camp', 'creek-culvert', 'creek-shoe'],
    scenes: [{ memory: 'thermos', event: 'creek-thermos' }],
    finds: [
      {
        flag: 'loc-highway',
        log: 'Below the culvert the creek runs under a road. Four lanes, heading out of the valley.',
      },
    ],
  },
  {
    id: 'highway',
    label: 'walk the highway',
    hint: 'a morning out, an afternoon back',
    cost: { rations: 2, water: 2 },
    days: 0.25,
    depart: 'You climb the embankment and walk the centre line.',
    encounters: ['highway-cars', 'highway-truck', 'highway-sign', 'highway-walker'],
    scenes: [{ memory: 'road', event: 'highway-overpass' }],
    finds: [
      {
        flag: 'loc-suburb',
        log: 'From the overpass: rooftops standing in brown water, where the low streets were.',
      },
      {
        flag: 'loc-hospital',
        log: 'A blue sign, half burned: HOSPITAL, 2. You will need a light to go inside.',
      },
    ],
  },
  {
    id: 'suburb',
    label: 'wade the drowned suburb',
    hint: 'most of a day, and cold',
    cost: { rations: 3, water: 2 },
    days: 0.3,
    depart: 'You go down toward the water and the roofs.',
    encounters: ['suburb-boat', 'suburb-attic', 'suburb-shop', 'suburb-garage'],
    scenes: [
      { memory: 'sill', event: 'suburb-house' },
      { memory: 'marks', event: 'suburb-doorframe' },
    ],
    requests: [{ event: 'request-found', chain: 'ring', when: { notFlags: ['request-ring'] } }],
  },
  {
    id: 'hospital',
    label: 'search the hospital',
    hint: 'most of a day; dark inside',
    cost: { rations: 3, water: 2, torch: 1 },
    days: 0.35,
    depart: 'You light the torch at the fire and carry it east.',
    encounters: ['hospital-ward', 'hospital-dispensary', 'hospital-basement', 'hospital-corridor'],
    scenes: [
      { memory: 'script', event: 'hospital-station' },
      { memory: 'buses', event: 'hospital-bay' },
    ],
  },
  {
    id: 'relay',
    label: 'climb to the relay station',
    hint: 'dawn to dusk, uphill both ways',
    cost: { rations: 4, water: 3, torch: 1 },
    days: 0.4,
    depart: 'You take the service road up Harrow Hill.',
    encounters: ['relay-fence', 'relay-stores', 'relay-racks', 'relay-roof'],
    scenes: [
      { memory: 'booth', event: 'relay-booth' },
      { memory: 'daythree', event: 'relay-tray' },
      { memory: 'loop', event: 'relay-machine' },
    ],
  },

  // The far valley (content/frontier.js): found through the notebook's maps, the neighbours, a second year.
  {
    id: 'quarry',
    label: 'go up to the quarry',
    hint: 'a long morning; stone, salvage, and a view',
    cost: { rations: 2, water: 2 },
    days: 0.3,
    depart: 'You take the old haul road toward the grey cut in the hillside.',
    encounters: ['quarry-face', 'quarry-shed', 'quarry-pool', 'quarry-truck'],
    scenes: [],
  },
  {
    id: 'lake',
    label: 'walk out to the lake',
    hint: 'fish, reeds, and summer cabins',
    cost: { rations: 2, water: 1 },
    days: 0.3,
    depart: 'You follow the outflow up through the birches to the lake.',
    encounters: ['lake-ice', 'lake-boathouse', 'lake-reeds', 'lake-cabin'],
    scenes: [],
  },
  {
    id: 'farm',
    label: 'search the old farmstead',
    hint: 'a day there and back; jars, seed, machinery',
    cost: { rations: 3, water: 2 },
    days: 0.35,
    depart: 'You cut across the fields toward the farmhouse with the fallen barn.',
    encounters: ['farm-barn', 'farm-kitchen', 'farm-orchard', 'farm-grave'],
    scenes: [],
  },
  {
    id: 'station',
    label: 'visit the ranger station',
    hint: 'the neighbours: news, seed, a little trade',
    cost: { rations: 2, water: 1 },
    days: 0.3,
    depart: 'You walk east to the ranger station, keeping your hands where they can be seen.',
    encounters: ['station-gate', 'station-garden', 'station-child', 'station-radio'],
    scenes: [],
  },
  {
    id: 'pass',
    label: 'climb to the pass',
    hint: 'dawn to dark, above the trees: see what lies beyond',
    cost: { rations: 4, water: 3 },
    days: 0.45,
    depart: 'You leave before light and climb until the trees give out.',
    encounters: ['pass-snowfield', 'pass-hut', 'pass-cairn', 'pass-ibex'],
    scenes: [],
  },
];

export const LOCATION_BY_ID = indexById(LOCATIONS);
