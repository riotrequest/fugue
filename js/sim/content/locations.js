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
];

export const LOCATION_BY_ID = indexById(LOCATIONS);
