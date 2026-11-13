import { createGame } from '../../js/sim/index.js';

/**
 * A scripted player. It sees only what a person would (the public read models)
 * and plays by a greedy rule of thumb: keep the fire and yourself alive, put
 * every pair of hands to work, build whatever can be afforded, and gather
 * whatever is running shortest. It keeps no memory of its own, so a bot attached
 * to a restored save plays exactly as the original would have. It serves as an
 * end-to-end test and as the yardstick for balance.
 *
 * Styles:
 *   'settler'  stays at the fire and tries to see the thaw
 *   'seeker'   also goes out to the ruins, raises the mast and calls out
 *   'walker'   plays as a settler, then walks away once that is possible
 */

/** Work wanted from each successive healthy survivor. Roles not yet available are skipped. */
const STAFFING = [
  'tender', 'woodcutter', 'carrier', 'trapper', 'cook', 'forager',
  'trapper', 'woodcutter', 'guard', 'trapper', 'carrier', 'guard', 'forager',
];

/** Which job each work tool equips. */
const TOOL_JOBS = { axe: 'woodcutter', knife: 'trapper', spear: 'hunter', waterskin: 'carrier' };

/** Things to build and make, most wanted first. */
const PROJECTS = [
  'build-leanto', 'make-axe', 'make-knife', 'build-snares', 'build-rack', 'build-raincatcher', 'build-shed',
  'build-workbench', 'make-pot', 'make-spear', 'build-garden', 'build-cabin', 'build-bunkhouse', 'make-waterskin', 'make-coat',
  'make-pack', 'build-smokehouse', 'build-palisade', 'build-watchtower', 'build-radio',
];

/** Where each raw material comes from, for when a project is short of it. */
const SOURCE_OF = {
  wood: 'gather-wood',
  tinder: 'gather-wood',
  stone: 'fetch-water',
  fiber: 'forage',
  forage: 'forage',
  hide: 'check-snares',
};

const DESTINATIONS = ['go-relay', 'go-hospital', 'go-suburb', 'go-highway', 'go-creek'];

/** Choices the bot only takes when nothing else is on offer. */
const RELUCTANT = new Set(['refuse', 'go', 'noise', 'ignore', 'stand', 'let', 'squeeze', 'boat', 'wait', 'leave']);

/** Seconds between the bot's moves: roughly a person reading, deciding and clicking. */
export const REACTION = 1;

const byId = (list) => Object.fromEntries(list.map((entry) => [entry.id, entry]));

/**
 * @param {import('../../js/sim/index.js').Game} game
 * @param {'settler'|'seeker'|'walker'} style
 */
export function createBot(game, style = 'settler') {

  function resolve(event) {
    const open = event.choices.filter((choice) => choice.enabled);
    const pick = open.find((choice) => !RELUCTANT.has(choice.id)) ?? open[0];
    const wanted = event.id === 'leave' ? open.find((choice) => choice.id === 'go') : pick;
    game.choose((wanted ?? pick).id);
  }

  function staff(people) {
    if (!people) return;
    const roles = byId(people.roles);
    const hands = people.total - people.sick;
    const wanted = {};
    for (const id of STAFFING) {
      const filled = Object.values(wanted).reduce((sum, count) => sum + count, 0);
      if (filled >= hands) break;
      const role = roles[id];
      if (role && (role.max === null || (wanted[id] ?? 0) < role.max)) wanted[id] = (wanted[id] ?? 0) + 1;
    }
    for (const role of people.roles) {
      for (let extra = role.count - (wanted[role.id] ?? 0); extra > 0; extra--) game.assign(role.id, -1);
    }
    for (const role of people.roles) {
      for (let short = (wanted[role.id] ?? 0) - role.count; short > 0; short--) game.assign(role.id, 1);
    }
  }

  /** Makes one move: answers the open event, or does the most pressing thing. */
  function act() {
    const event = game.event();
    if (event) {
      resolve(event);
      return;
    }

    const actions = byId(game.actions());
    const stores = byId(game.resources());
    const vitals = byId(game.vitals());
    const people = game.people();
    const scene = game.view();
    const have = (id) => stores[id]?.amount ?? 0;
    const level = (id) => vitals[id]?.value ?? 1;
    const attempt = (id) => Boolean(actions[id]?.enabled) && game.perform(id);

    if (attempt('wake')) return;
    staff(people);

    const staffed = (id) => (people?.roles.find((role) => role.id === id)?.count ?? 0) > 0;
    const keeper = staffed('tender');
    if (attempt('relight')) return;
    if (scene.fire < (keeper ? 0.3 : 0.55 + 0.4 * scene.cold) && attempt('stoke')) return;

    if (level('water') < 0.5 && attempt('drink')) return;
    if (level('food') < 0.5 && (attempt('eat') || attempt('eat-forage'))) return;
    if (level('health') < 0.5 && attempt('treat')) return;
    if (level('health') < 0.85 && attempt('rest')) return;

    if (style === 'seeker' && attempt('beacon')) return;
    if (style === 'walker' && attempt('leave')) return;

    // A cook gets twice as much from the same meat, so leave it for them.
    if (!staffed('cook') && have('water') >= 3 && attempt('stew')) return;
    if (!staffed('cook') && attempt('cook')) return;
    if (style === 'seeker' && have('torch') < 2 && attempt('make-torch')) return;
    // Work tools: one for your own hands, then one per worker in the job that uses it.
    const enoughTools = (id) => {
      const role = TOOL_JOBS[id.replace('make-', '')];
      if (!role) return false;
      const workers = people?.roles.find((entry) => entry.id === role)?.count ?? 0;
      return have(id.replace('make-', '')) >= 1 + workers;
    };
    for (const id of PROJECTS) if (!enoughTools(id) && attempt(id)) return;

    const mouths = (people?.total ?? 0) + 1;
    const fitToTravel =
      style === 'seeker' &&
      (keeper || !people) &&
      Math.min(level('food'), level('water'), level('health')) > 0.5 &&
      have('wood') >= 10 &&
      have('rations') >= 6 &&
      have('water') >= 5;
    if (fitToTravel) {
      // Rotate through everywhere that can be reached, a different place each day.
      const open = DESTINATIONS.filter((id) => actions[id]?.enabled);
      if (open.length > 0 && attempt(open[scene.day % open.length])) return;
    }

    if (have('rations') < (stores.rations?.cap ?? 20) && (attempt('check-snares') || attempt('hunt'))) return;

    // What the first project we cannot yet afford is waiting on.
    const blocked = PROJECTS.map((id) => actions[id]).find((action) => action && !action.enabled);
    const shortfall = blocked?.cost.find((item) => item.have < item.amount && SOURCE_OF[item.id]);

    const pressure = {
      'gather-wood': 1 - have('wood') / (14 + 4 * mouths),
      'fetch-water': 1 - have('water') / (3 + mouths),
      forage: 1 - (have('forage') + 2 * have('rations')) / (6 + 4 * mouths),
    };
    if (have('tinder') === 0) pressure['gather-wood'] += 0.3;
    if (shortfall) pressure[SOURCE_OF[shortfall.id]] = Math.max(pressure[SOURCE_OF[shortfall.id]] ?? 0, 0.6);

    const chores = Object.keys(pressure)
      .filter((id) => actions[id]?.enabled && pressure[id] > 0)
      .sort((a, b) => pressure[b] - pressure[a]);
    if (chores.length > 0) attempt(chores[0]);
  }

  return { act };
}

/**
 * Plays one game in simulated time.
 * @param {object} [opts]
 * @param {number} [opts.seed]
 * @param {'easy'|'normal'|'hard'} [opts.difficulty]
 * @param {'settler'|'seeker'|'walker'|'idle'} [opts.style]  'idle' never touches anything
 * @param {number} [opts.minutes]  give up after this much simulated real time
 * @param {number} [opts.step]     seconds per tick
 * @param {(game: import('../../js/sim/index.js').Game, seconds: number) => void} [opts.onTick]
 * @returns {{ game: import('../../js/sim/index.js').Game, seconds: number }}
 */
export function playthrough({ seed = 1, difficulty = 'normal', style = 'settler', minutes = 90, step = 0.25, onTick } = {}) {
  const game = createGame({ seed, difficulty });
  const bot = style === 'idle' ? null : createBot(game, style);
  const ticksPerMove = Math.round(REACTION / step);
  let ticks = 0;
  while (ticks * step < minutes * 60 && !game.status().ended) {
    if (ticks % ticksPerMove === 0) bot?.act();
    game.tick(step);
    ticks += 1;
    onTick?.(game, ticks * step);
  }
  return { game, seconds: ticks * step };
}
