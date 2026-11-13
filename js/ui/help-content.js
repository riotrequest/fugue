import { EXPEDITION, PEOPLE, SEASON, TIME, VITALS } from '../sim/tuning.js';

/**
 * The field guide. Numbers come from tuning.js so the guide stays true when the
 * balance changes. Sections other than the basics stay locked until the player
 * has met what they describe, so the guide never spoils what is coming.
 *
 * A point is a string, or `{ keys, text }` for a row of keyboard keys.
 *
 * @typedef {import('../sim/index.js').Game} Game
 * @typedef {{
 *   id: string,
 *   title: string,
 *   lead: string,
 *   points: (string | { keys: string[], text: string })[],
 *   unlocked?: (game: Game) => boolean,
 * }} HelpSection
 */

const minutes = (seconds) => Math.round(seconds / 60);
const percent = (fraction) => `${Math.round(fraction * 100)}%`;

/** @type {HelpSection[]} */
export const HELP_SECTIONS = [
  {
    id: 'basics',
    title: 'the basics',
    lead: 'Keep the fire alive. Keep yourself alive.',
    points: [
      `A day and night lasts about ${minutes(TIME.daySeconds)} minutes.`,
      `Each night is longer and colder. Deep winter comes around day ${SEASON.deepWinterDay}, and the thaw around day ${SEASON.thawDay}. Hold on until spring.`,
      'Pick easy, normal or hard when you first wake. Hard means it.',
      'New actions, people and places appear as you find them.',
      'The game saves itself. “begin again” wipes it.',
      'There is more than one way this ends.',
    ],
  },
  {
    id: 'fire',
    title: 'the fire',
    lead: 'Your light, your warmth, your wall against the dark.',
    points: [
      'Stoke it with wood: embers, low, burning, roaring.',
      'It always burns down. Wind and cold make it burn faster.',
      'Rain and snow eat at an open fire. A roof over it keeps most of that off.',
      'If it dies, relight it with 1 tinder and 1 wood.',
      'Always keep spare tinder.',
    ],
  },
  {
    id: 'body',
    title: 'staying alive',
    lead: 'Your bars sit in the top-right of the scene.',
    points: [
      'Warmth comes from the fire. Night and cold pull it down.',
      'Food and water drain all the time. Water goes faster.',
      'Rain and snow soak you through. The warmth bar says so when they do.',
      `Health drops when any of them runs out, and mends when all are above ${percent(VITALS.mendAbove)}.`,
      'Green is fine. Gold is low. Red means act now.',
    ],
  },
  {
    id: 'work',
    title: 'actions',
    lead: 'Every button is something you do yourself.',
    points: [
      'A gold fill means the action is recovering.',
      'Buttons run side by side: start one while another recovers.',
      'A grey button says why underneath it.',
      'Searching and hunting need daylight.',
      'Stores have limits. Build to hold more; make tools to gather more.',
      'Short of something? Point at the button, or at the store, to see where it comes from.',
    ],
  },
  {
    id: 'voices',
    title: 'the voices',
    lead: 'A bright fire gets seen. People will come.',
    unlocked: (game) => game.people() !== null,
    points: [
      'Strangers won’t come to a dying fire.',
      'Everyone needs a bed. Roofs make room for more.',
      'Give people jobs with + and −. They work on their own. Hover a job to see what it does.',
      'Workers use one tool each: an axe per woodcutter, a spear per hunter. Make more as the camp grows.',
      'Raw meat feeds no one until a cook turns it into rations.',
      `Each one needs a meal and a drink every ${minutes(PEOPLE.upkeepSeconds)} minutes.`,
      'Hunger, thirst and cold make people sick, and the sick stop working. Good meals or medicine bring them back.',
      'At dawn, the weakest may leave. Their job flashes red.',
      'Each dawn the log tallies what the camp brought in and what it ate.',
      'Not everyone pulls their weight. Some work like two people, some barely work, and some steal. You find out in time.',
    ],
  },
  {
    id: 'night',
    title: 'the night',
    lead: 'Something waits in the tree line.',
    unlocked: (game) => game.state.chapter >= 2,
    points: [
      'Danger builds after dark, fastest when the fire is low.',
      'Keep the fire above half and it mostly stays back.',
      'Daylight drives it off. Guards, a palisade and a watchtower help.',
      'Stock wood and set a fire keeper before a long night.',
    ],
  },
  {
    id: 'venture',
    title: 'going out',
    lead: 'There is more out there than the clearing.',
    unlocked: (game) => game.actions().some((action) => action.group === 'venture'),
    points: [
      'Trips leave at dawn or by day, if you are strong enough.',
      'The camp keeps running without you. Leave a fire keeper.',
      'Choices on the way: click them or press 1–9.',
      `Rest ${EXPEDITION.restSeconds} seconds at the fire before the next trip.`,
    ],
  },
  {
    id: 'memories',
    title: 'memories',
    lead: 'You woke with nothing. Pieces come back.',
    unlocked: (game) => game.memories().some((memory) => memory.found),
    points: [
      'Found memories are kept under “memories” in the top bar.',
      'The button pulses when a new one comes back.',
    ],
  },
  {
    id: 'keys',
    title: 'keys',
    lead: 'Everything works with a mouse too.',
    points: [
      { keys: ['P', 'Esc'], text: 'pause' },
      { keys: ['1', '–', '9'], text: 'pick a choice' },
      { keys: ['?', 'H'], text: 'this guide' },
      { keys: ['Esc'], text: 'close' },
    ],
  },
];
