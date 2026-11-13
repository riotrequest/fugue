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
      'A clay pot turns meat, forage and water into stew: more rations than cooking them apart.',
      `Each one needs a meal and a drink every ${minutes(PEOPLE.upkeepSeconds)} minutes.`,
      'Hunger, thirst and cold make people sick, and the sick stop working. Good meals or medicine bring them back.',
      'At dawn, the weakest may leave. Their job flashes red.',
      'Each dawn the log tallies what the camp brought in and what it ate.',
      'Every couple of days a trader comes by in daylight with a few deals: anything from cord to radio parts, for things you have plenty of. Trade as many as you like.',
      'Not everyone pulls their weight. Some work like two people, some barely work, and some steal. You find out in time.',
    ],
  },
  {
    id: 'trust',
    title: 'trust and bonds',
    lead: 'They are people, not hands. They remember how you treat them.',
    unlocked: (game) => (game.people()?.total ?? 0) > 0,
    points: [
      'Open “who is here” in the voices panel and pick a name to see their card: job, health, trust, friends.',
      'Full meals, care when sick and fair choices build trust. Hunger, cold and harsh choices wear it down.',
      'The loyal work harder and stand by you when it counts. The wary may down tools after a hungry day, or walk out at dawn.',
      'Friends heal and settle faster together. Losing someone close hurts everyone who loved them; a cairn for the dead eases it.',
      'Some survivors have stories of their own that unfold over days. Their card says when one is under way.',
    ],
  },
  {
    id: 'notebook',
    title: 'the notebook',
    lead: 'Work things out, one at a time.',
    unlocked: (game) => game.notebook() !== null,
    points: [
      'Open “notebook” in the top bar and choose a project. You work on it whenever you are awake at the fire.',
      'Set survivors as scholars to go faster (by day). A schoolhouse helps too.',
      'Finished projects make jobs faster, open new buildings, or put new places on the map.',
      'Switching projects keeps the progress you made.',
      'The notebook also lists the camp’s long-term aims, and its story so far.',
    ],
  },
  {
    id: 'seasons',
    title: 'after the thaw',
    lead: 'If you stay, the year keeps turning.',
    unlocked: (game) => Boolean(game.state.flags['continued:thaw']),
    points: [
      'Spring, summer, autumn, then a second winter, longer than the first.',
      'Summer heat makes everyone thirsty. Storms can drown an open fire fast.',
      'Use the warm months to build, research and fill the stores. The winter will empty them.',
      'Live through the second winter and see what the camp has become.',
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
