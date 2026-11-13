import { VITALS } from './tuning.js';
import { paragraphs } from './util.js';
import { MEMORIES } from './content/memories.js';
import { RESOURCES, RESOURCE_GROUP_BY_ID } from './content/resources.js';
import { ROLES } from './content/roles.js';
import { CHAPTERS } from './content/story.js';
import { FIRE_STATES, VITAL_DEFS } from './content/vitals.js';
import { amount, bedsOf, capOf } from './systems/camp.js';
import { meets } from './systems/conditions.js';
import { bandOf, exposureOf, intensityOf } from './systems/fire.js';
import { countIn, knownTraitOf, poseOf, roomIn } from './systems/people.js';
import { canContinue } from './systems/endings.js';
import { dialOf } from './systems/difficulty.js';
import { coldOf, isAway, phaseOf, seasonOf } from './systems/time.js';
import { weatherOf } from './systems/weather.js';

/**
 * Read models: everything the UI, renderer and audio are allowed to know, shaped
 * for them. Each function is a pure projection of the state.
 *
 * @typedef {import('./state.js').GameState} GameState
 *
 * @typedef {object} Status
 * @property {number} day
 * @property {number} time          0..1, 0 = midnight, 0.5 = noon
 * @property {'dawn'|'day'|'dusk'|'night'} phase
 * @property {string} clock         e.g. 'Day 3 · dusk'
 * @property {string} weather       weather id
 * @property {string} weatherLabel
 * @property {string} chapter       e.g. 'Subject' (the log keeps the numeral)
 * @property {string} season        e.g. 'late autumn', 'deep winter, thaw in 3 days'
 * @property {string} difficulty    'easy' | 'normal' | 'hard'
 * @property {string} fireLabel     e.g. 'the fire is roaring'
 * @property {{ id: string, title: string, text: string }|null} ended
 *
 * @typedef {object} VitalView
 * @property {string} id            'fire', then 'warmth' | 'food' | 'water' | 'health'
 * @property {string} label
 * @property {number} value         0..1, where 1 is always the good end
 * @property {'ok'|'warn'|'danger'} tone
 * @property {string} note          one word, e.g. 'shivering'
 *
 * @typedef {object} ResourceView
 * @property {string} id
 * @property {string} label
 * @property {number} amount
 * @property {number|null} cap
 * @property {string} group
 * @property {string} groupLabel
 * @property {string|null} source   where more comes from
 *
 * @typedef {object} PeopleView
 * @property {number} total
 * @property {number} idle          well enough to work and not assigned
 * @property {number} sick          too weak to work (extra to the original contract)
 * @property {number} cap           beds
 * @property {{ id: string, label: string, hint: string, count: number, max: number|null }[]} roles
 * @property {string[]} names
 *
 * @typedef {object} MemoryView
 * @property {string} id
 * @property {string} title
 * @property {string} text
 * @property {boolean} found
 *
 * @typedef {object} SceneView
 * @property {number} time
 * @property {number} day
 * @property {number} fire              0..1 intensity
 * @property {string} weather           'clear' | 'rain' | 'snow' | 'fog' | 'ash'
 * @property {number} weatherIntensity  0..1
 * @property {number} wind              0..1
 * @property {number} cold              0..1
 * @property {number} wood              0..1 woodpile fullness
 * @property {'asleep'|'sitting'|'tending'|'away'} player
 * @property {{ id: number, seed: number, pose: 'sitting'|'sleeping'|'standing'|'working'|'away' }[]} people
 * @property {string[]} structures
 * @property {number} threat            0..1
 * @property {boolean} beacon
 * @property {string|null} ended        ending id
 */

/** Rain or snow heavy enough to say so, and the player at the fire to feel it. */
const weatherBites = (state) =>
  state.weather.intensity >= WEATHER_SAYS_FROM && !isAway(state) && Boolean(weatherOf(state).onBody);

/** Weather is named under the scene and on the warmth bar from this intensity. */
const WEATHER_SAYS_FROM = 0.3;

/** The fire's state under the scene, with what the weather is doing to it. */
function fireLabelOf(state) {
  const label = FIRE_STATES[bandOf(state)].label;
  const { onFire } = weatherOf(state);
  const exposed = exposureOf(state) > 0.3;
  return onFire && exposed && state.fire.lit && weatherBites(state) ? `${label} · ${onFire}` : label;
}

const toneOf = (value) =>
  value < VITALS.dangerBelow ? 'danger' : value < VITALS.warnBelow ? 'warn' : 'ok';

/** Picks one of four notes, best to worst, by the same thresholds that colour the bar. */
const noteOf = (notes, value) =>
  notes[value >= VITALS.revealBelow ? 0 : value >= VITALS.warnBelow ? 1 : value >= VITALS.dangerBelow ? 2 : 3];

/** @param {GameState} state @returns {Status} */
export function status(state) {
  const phase = phaseOf(state);
  return {
    day: state.clock.day,
    time: state.clock.time,
    phase,
    clock: `Day ${state.clock.day} · ${phase}`,
    weather: state.weather.id,
    weatherLabel: weatherOf(state).label,
    chapter: CHAPTERS[state.chapter - 1].split(' · ').pop(),
    season: seasonOf(state),
    difficulty: dialOf(state).label,
    fireLabel: fireLabelOf(state),
    ended: state.ended ? { ...state.ended, canContinue: canContinue(state) } : null,
  };
}

/** @param {GameState} state @returns {VitalView[]} */
export function vitals(state) {
  const fire = intensityOf(state);
  return [
    { id: 'fire', label: 'fire', value: fire, tone: toneOf(fire), note: FIRE_STATES[bandOf(state)].note },
    ...VITAL_DEFS.filter((def) => state.revealed.includes(def.id)).map((def) => {
      const value = state.player.vitals[def.id];
      const tone = toneOf(value);
      // Rain and snow name themselves on the warmth bar, so their bite is plain.
      const wet = def.id === 'warmth' && tone !== 'danger' && weatherBites(state);
      return { id: def.id, label: def.label, value, tone, note: wet ? weatherOf(state).onBody : noteOf(def.notes, value) };
    }),
  ];
}

/** @param {GameState} state @returns {ResourceView[]} */
export function resources(state) {
  return RESOURCES.filter((def) => state.known.includes(def.id)).map((def) => ({
    id: def.id,
    label: def.label,
    amount: amount(state, def.id),
    cap: capOf(state, def.id),
    group: def.group,
    groupLabel: RESOURCE_GROUP_BY_ID[def.group].label,
    source: def.source ?? null,
  }));
}

/** @param {GameState} state @returns {PeopleView|null} null until someone has found the fire */
export function people(state) {
  if (!state.flags.met) return null;
  const sick = state.people.filter((person) => person.sick).length;
  return {
    total: state.people.length,
    idle: state.people.filter((person) => person.role === null && !person.sick).length,
    sick,
    cap: bedsOf(state),
    roles: ROLES.filter((role) => meets(state, role.when)).map((role) => ({
      id: role.id,
      label: role.label,
      hint: role.hint,
      count: countIn(state, role.id),
      max: roomIn(state, role),
      tool: role.tool ? { label: role.tool.label, have: amount(state, role.tool.id), required: Boolean(role.tool.required) } : null,
    })),
    // Once the camp knows what someone is, it says so beside their name.
    names: state.people.map((person) => {
      const trait = knownTraitOf(person);
      return trait ? `${person.name} (${trait})` : person.name;
    }),
  };
}

/** @param {GameState} state @returns {MemoryView[]} in story order */
export function memories(state) {
  return MEMORIES.map((memory) => ({
    id: memory.id,
    title: memory.title,
    text: paragraphs(memory.text),
    found: state.memories.includes(memory.id),
  }));
}

function playerPose(state) {
  if (!state.player.awake) return 'asleep';
  if (isAway(state)) return 'away';
  return state.elapsed < state.player.tendingUntil ? 'tending' : 'sitting';
}

/** Called every frame by the renderer and the audio engine. @param {GameState} state @returns {SceneView} */
export function scene(state) {
  const phase = phaseOf(state);
  return {
    time: state.clock.time,
    day: state.clock.day,
    fire: intensityOf(state),
    weather: state.weather.id,
    weatherIntensity: state.weather.intensity,
    wind: state.weather.wind,
    cold: coldOf(state),
    wood: amount(state, 'wood') / capOf(state, 'wood'),
    player: playerPose(state),
    people: state.people.map((person) => ({ id: person.id, seed: person.seed, pose: poseOf(person, phase) })),
    structures: state.built.slice(),
    threat: state.threat,
    beacon: Boolean(state.flags.beacon),
    ended: state.ended ? state.ended.id : null,
  };
}
