import { DIRECTOR, FIRE, PEOPLE, TIME, TRADE, VITALS, WEATHER } from './tuning.js';
import { OPENING_LINES } from './content/lines.js';

/** Bump whenever the shape of GameState changes; older saves are then discarded. */
export const SAVE_VERSION = 1;

/**
 * The whole game, as plain JSON. Anything derivable (fire intensity, cold, phase,
 * storage caps) is computed on demand rather than stored, so it cannot drift.
 *
 * @typedef {object} Person
 * @property {number} id
 * @property {string} name
 * @property {number} seed       stable per person; lets the renderer vary how they look
 * @property {string|null} role
 * @property {number} health     0..1
 * @property {boolean} sick      too weak to work until they recover
 * @property {string} [trait]     hidden nature (content/traits.js); absent in old saves
 * @property {number} [since]     when they arrived
 * @property {boolean} [noticed]  whether the camp has found out their trait
 * @property {number} [thefts]    times they have stolen
 * @property {boolean} [forgiven] caught and let off
 * @property {number} [trust]     0..1, how far they trust you (absent in old saves: 0.5)
 * @property {Record<string, 'friend'|'rival'|'partner'>} [bonds]  by the other person's id
 * @property {string} [arc]       the personal story chain that is theirs, if any
 *
 * @typedef {object} ChainState   a story chain under way (systems/chains.js)
 * @property {string} stage       the stage it waits at, or 'done'
 * @property {number} at          earliest elapsed second the stage may play
 * @property {object} ctx         its cast, carried from stage to stage
 * @property {string} [note]      what the player knows of it, for the survivor card
 *
 * @typedef {object} History      what the settlement remembers (systems/history.js)
 * @property {{ name: string, day: number, cause: string }[]} dead
 * @property {{ id: number, name: string, day: number, trait: string, trust: number, exiled: boolean, seed: number, returned?: boolean }[]} gone
 * @property {{ day: number, text: string }[]} records   the camp's chronicle, a few lines per season
 *
 * @typedef {object} GameState
 * @property {number} version
 * @property {'easy'|'normal'|'hard'} difficulty
 * @property {{ got: Record<string, number>, meals: number, drinks: number }} ledger   today's work and upkeep
 * @property {number} rng                      position in the random stream
 * @property {number} elapsed                  simulated seconds; stops while an event is open
 * @property {{ day: number, time: number }} clock   time is 0..1, 0 = midnight
 * @property {{ id: string, intensity: number, wind: number, until: number }} weather
 * @property {{ lit: boolean, fuel: number, band: string }} fire
 * @property {{ awake: boolean, vitals: Record<string, number>, harm: string, tendingUntil: number, awayFor: number }} player
 * @property {number} chapter                  1..5
 * @property {Record<string, number>} resources
 * @property {string[]} known                  resource ids the player has ever held
 * @property {string[]} revealed               vital ids shown to the player
 * @property {string[]} built                  structure ids, in build order
 * @property {Record<string, true>} flags      story switches and fired milestones
 * @property {Record<string, number>} counts   times each action has been performed
 * @property {Record<string, { until: number, total: number }>} cooldowns
 * @property {Person[]} people
 * @property {number} nextPersonId
 * @property {string[]} namesUsed
 * @property {Record<string, number>} progress fractional work carried between ticks
 * @property {number} upkeepTurn               whose turn it is to eat
 * @property {number} threat                   0..1
 * @property {string[]} memories               fragment ids, in the order found
 * @property {Record<string, number>} visits   trips made to each location
 * @property {{ id: string, ctx: object }|null} event
 * @property {{ location: string, queue: string[], bag: Record<string, number> }|null} expedition
 * @property {Record<string, number>} seen     when each event or reminder last happened
 * @property {Record<string, number>} lastLine last pick from each line pool
 * @property {{ arrival: number, incident: number, ambient: number, voice: number }} timers
 * @property {{ text: string, tone: string, day: number }[]} log
 * @property {{ id: string, title: string, text: string }|null} ended
 * @property {number} roaring                  seconds the fire has spent roaring, all told
 * @property {Record<string, ChainState>} chains
 * @property {{ active: string|null, progress: Record<string, number>, done: string[] }} research
 * @property {History} history
 */

/** @param {number} seed @param {string} [difficulty] @returns {GameState} */
export function createState(seed, difficulty = 'normal') {
  return {
    version: SAVE_VERSION,
    difficulty,
    ledger: { got: {}, meals: 0, drinks: 0 },
    rng: seed >>> 0,
    elapsed: 0,
    clock: { day: 1, time: TIME.startTime },
    weather: { id: 'clear', intensity: 0, wind: 0.2, until: WEATHER.openingSpell },
    fire: { lit: true, fuel: FIRE.startFuel, band: 'embers' },
    player: {
      awake: false,
      vitals: { ...VITALS.start },
      harm: 'cold',
      tendingUntil: 0,
      awayFor: 0,
    },
    chapter: 1,
    resources: { wood: 3 },
    known: ['wood'],
    revealed: [],
    built: [],
    flags: {},
    counts: {},
    cooldowns: {},
    people: [],
    nextPersonId: 1,
    namesUsed: [],
    progress: {},
    upkeepTurn: 0,
    threat: 0,
    memories: [],
    visits: {},
    event: null,
    expedition: null,
    seen: {},
    lastLine: {},
    timers: {
      arrival: DIRECTOR.strangerAt + DIRECTOR.arrivalGap[0],
      incident: DIRECTOR.firstIncident,
      ambient: DIRECTOR.ambientGap[0],
      voice: DIRECTOR.voiceGap[0],
      turnedAway: 0,
      theft: PEOPLE.theftGap[1],
      trader: TRADE.firstAt,
    },
    log: OPENING_LINES.map((text) => ({ text, tone: 'normal', day: 1 })),
    ended: null,
    roaring: 0,
    chains: {},
    research: { active: null, progress: {}, done: [] },
    history: { dead: [], gone: [], records: [] },
  };
}

/** Keys a save from before them may lack; they are filled in on load. */
const ADDED_LATER = ['difficulty', 'ledger', 'roaring', 'chains', 'research', 'history'];

const kindOf = (value) => (Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value);

/**
 * Accepts only what `serialize()` produced for this version: a foreign, damaged or
 * outdated save yields null and the caller starts a fresh game instead.
 *
 * @param {unknown} save
 * @returns {GameState|null}
 */
export function restoreState(save) {
  if (kindOf(save) !== 'object' || save.version !== SAVE_VERSION) return null;
  const template = createState(0);
  // Added after saves already existed: older games pick up the defaults.
  save = { ...save };
  for (const key of ADDED_LATER) if (!(key in save)) save[key] = template[key];
  const nullable = ['event', 'expedition', 'ended'];
  const fits = Object.keys(template).every((key) => {
    const kind = kindOf(save[key]);
    return nullable.includes(key) ? kind === 'object' || kind === 'null' : kind === kindOf(template[key]);
  });
  if (!fits) return null;
  try {
    return JSON.parse(JSON.stringify(save));
  } catch {
    return null;
  }
}
