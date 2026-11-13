import { DIRECTOR, FIRE, TRUST } from '../tuning.js';
import { fill } from '../util.js';
import { BUILDING_BY_ID } from '../content/buildings.js';
import { MEMORY_BY_ID } from '../content/memories.js';
import { CHAPTERS } from '../content/story.js';
import { add, remove } from './camp.js';
import { end } from './endings.js';
import { comeHome, setOut, stash } from './expedition.js';
import { feed } from './fire.js';
import { log, sfx, vary } from './journal.js';
import { openEvent } from './modal.js';
import { addPerson, adjustTrust, changeHealth, depart, forgive, reform, rejoin, setBond } from './people.js';
import { chronicle, turnedBack } from './history.js';
import { endChain, scheduleChain } from './chains.js';
import { insight } from './research.js';
import { nudge } from './vitals.js';
import { setWeather } from './weather.js';
import { afterDeal } from './trade.js';
import { GAME_GROUNDS } from '../content/game.js';
import { catchGame, rollYields } from './yields.js';

/**
 * The effect language. Everything that changes the world from content (actions,
 * event choices, milestones) is a list of small JSON objects, each named by its
 * first key and interpreted here. Because effects are plain data they can be
 * stored in a save, which is how a memory scene remembers what follows it.
 *
 *   { log: 'text' | ['one', 'of', 'these'], tone?, empty? }   `{name}` is the event's cast;
 *                                        `empty` replaces the text when the last yield found nothing
 *   { sfx: 'name' }
 *   { grant: { id: n | [min, max] } }    into the pack while on an expedition
 *   { take: { id: n } }                  never below zero
 *   { yield: YieldDef[] }                a gathering roll (tools, season, weather)
 *   { game: 'snares' | 'hunt' }          try for an animal, and say what was caught or that nothing was
 *   { fuel: n }                          wood onto the fire; lights it if dead
 *   { vital: { id: delta } }             losing health counts as a wound
 *   { threat: level }
 *   { flag: 'id' }
 *   { trader: dealId }                   after a trade: the trader stays while deals are left
 *   { chapter: n }                       only ever forward
 *   { wake: true }
 *   { build: 'structure' }
 *   { weather: 'id' }
 *   { arrive: true, health? }            the event's newcomer joins the camp
 *   { person: { who: 'cast' | 'other' | 'pair' | 'random' | 'all' | 'sickest', health: delta, cause? } }
 *   { trust: { who, delta } }            how far they trust you (systems/people.js)
 *   { bond: 'friend' | 'rival' | 'partner' | null }   between the cast and `{other}`
 *   { idle: 'cast' }                     they put down their work
 *   { pick: 'loyal' }                    the most trusting survivor becomes the cast for what follows
 *   { arc: 'id' | null }                 the cast's personal story (content/chains.js)
 *   { rejoin: true | false }             someone who once walked out comes back, or is sent off for good
 *   { record: 'text' }                   a line in the settlement's chronicle
 *   { insight: n }                       n units of work on whatever the notebook is open at
 *   { chain: { id, stage: 'event', wait: [min, max] } }   the story continues later
 *   { chainEnd: 'id' }                   the story is over
 *   { depart: 'cast' | 'random' }
 *   { exile: 'cast' }                    driven out (a thief may grab food on the way)
 *   { forgive: 'cast' }                  a thief let off: steals less often
 *   { reform: 'cast' }                   a thief who stops for good
 *   { summon: true }                     the next arrival comes at once
 *   { memory: 'id', then?: effects }     recover a fragment, show it, then continue
 *   { next: 'event' }                    chain into another event, same cast
 *   { roll: p, pass?: effects, fail?: effects }
 *   { venture: 'location' } / { home: true }
 *   { end: 'ending' }
 *
 * @typedef {import('./journal.js').Sim} Sim
 * @typedef {Record<string, any>} Effect
 * @typedef {{ name?: string, person?: number }} Cast
 */

/** The parts of an event's context that say who it is about, carried on to whatever it opens next. */
const CAST_KEYS = ['name', 'person', 'other', 'otherId', 'lost', 'returning', 'chain'];
export const castOnly = (ctx) =>
  Object.fromEntries(CAST_KEYS.filter((key) => ctx[key] !== undefined).map((key) => [key, ctx[key]]));

/** The survivors an effect is aimed at. */
function targets(sim, who, ctx) {
  const { people } = sim.state;
  if (who === 'all') return people.slice();
  if (who === 'cast') return people.filter((person) => person.id === ctx.person);
  if (who === 'other') return people.filter((person) => person.id === ctx.otherId);
  if (who === 'pair') return people.filter((person) => person.id === ctx.person || person.id === ctx.otherId);
  if (who === 'sickest') {
    const sick = people.filter((person) => person.sick).sort((a, b) => a.health - b.health);
    return sick.slice(0, 1);
  }
  return people.length > 0 ? [sim.rng.pick(people)] : [];
}

/** @type {Record<string, (sim: Sim, op: Effect, ctx: Cast) => void>} */
const OPS = {
  log(sim, op, ctx) {
    // After a yield that turned up none of its first line, `empty` is told instead, so the log never claims a catch.
    const lines = op.empty && ctx.found === 0 ? op.empty : op.log;
    const text = Array.isArray(lines) ? vary(sim, lines) : lines;
    log(sim, fill(text, castOnly(ctx)), op.tone);
  },

  sfx: (sim, op) => sfx(sim, op.sfx),

  grant(sim, op) {
    for (const [id, spec] of Object.entries(op.grant)) {
      const count = Array.isArray(spec) ? sim.rng.int(...spec) : spec;
      if (sim.state.expedition) stash(sim, id, count);
      else add(sim.state, id, count);
    }
  },

  take(sim, op) {
    for (const [id, count] of Object.entries(op.take)) remove(sim.state, id, count);
  },

  yield(sim, op, ctx) {
    [ctx.found] = rollYields(sim, op.yield);
  },

  game(sim, op) {
    const animal = catchGame(sim, op.game);
    const lines = animal ? animal.lines : GAME_GROUNDS[op.game].empty;
    log(sim, vary(sim, lines), animal ? undefined : op.tone);
  },

  fuel(sim, op) {
    feed(sim.state, op.fuel);
    sim.state.player.tendingUntil = sim.state.elapsed + FIRE.tendingSeconds;
  },

  vital(sim, op) {
    for (const [id, delta] of Object.entries(op.vital)) nudge(sim, id, delta);
  },

  threat(sim, op) {
    sim.state.threat = op.threat;
  },

  flag(sim, op) {
    sim.state.flags[op.flag] = true;
  },

  chapter(sim, op) {
    if (op.chapter <= sim.state.chapter) return;
    sim.state.chapter = op.chapter;
    log(sim, CHAPTERS[op.chapter - 1], 'good');
    sfx(sim, 'unlock');
  },

  wake(sim) {
    sim.state.player.awake = true;
  },

  build(sim, op) {
    sim.state.built.push(op.build);
    log(sim, BUILDING_BY_ID[op.build].done, 'good');
    chronicle(sim.state, `Finished: ${BUILDING_BY_ID[op.build].label.split(' ').slice(1).join(' ')}.`);
    sfx(sim, 'build');
  },

  weather: (sim, op) => setWeather(sim, op.weather),

  arrive(sim, op, ctx) {
    addPerson(sim, ctx.name, op.health);
  },

  person(sim, op, ctx) {
    for (const person of targets(sim, op.person.who, ctx)) {
      // Name whoever was picked, so the line that follows can say who it was.
      if (op.person.who === 'sickest') Object.assign(ctx, { name: person.name, person: person.id });
      changeHealth(sim, person, op.person.health, op.person.cause ?? 'hardship');
    }
  },

  trust(sim, op, ctx) {
    for (const person of targets(sim, op.trust.who, ctx)) adjustTrust(person, op.trust.delta);
  },

  bond(sim, op, ctx) {
    const [a, b] = [ctx.person, ctx.otherId].map((id) => sim.state.people.find((person) => person.id === id));
    setBond(a, b, op.bond);
  },

  pick(sim, op, ctx) {
    if (op.pick !== 'loyal') return;
    const [best] = sim.state.people
      .filter((person) => !person.sick && (person.trust ?? TRUST.start) >= TRUST.loyal)
      .sort((a, b) => (b.trust ?? TRUST.start) - (a.trust ?? TRUST.start));
    if (!best) return;
    ctx.name = best.name;
    ctx.person = best.id;
  },

  idle(sim, op, ctx) {
    for (const person of targets(sim, op.idle, ctx)) person.role = null;
  },

  arc(sim, op, ctx) {
    for (const person of targets(sim, 'cast', ctx)) person.arc = op.arc;
  },

  rejoin(sim, op, ctx) {
    if (ctx.returning === undefined) return;
    if (op.rejoin) rejoin(sim, ctx.returning);
    else turnedBack(sim.state, ctx.returning);
  },

  insight: (sim, op) => insight(sim.state, op.insight),

  record(sim, op, ctx) {
    chronicle(sim.state, fill(op.record, castOnly(ctx)));
  },

  chain: (sim, op, ctx) => scheduleChain(sim, op.chain, castOnly(ctx)),

  chainEnd: (sim, op, ctx) => endChain(sim, op.chainEnd, ctx),

  depart(sim, op, ctx) {
    for (const person of targets(sim, op.depart, ctx)) depart(sim, person);
  },

  exile(sim, op, ctx) {
    for (const person of targets(sim, op.exile, ctx)) depart(sim, person, true);
  },

  forgive(sim, op, ctx) {
    for (const person of targets(sim, op.forgive, ctx)) forgive(person);
  },

  reform(sim, op, ctx) {
    for (const person of targets(sim, op.reform, ctx)) reform(person);
  },

  summon(sim) {
    sim.state.timers.arrival = sim.state.elapsed + DIRECTOR.summonDelay;
  },

  memory(sim, op, ctx) {
    const { state } = sim;
    const then = op.then ?? [];
    if (state.memories.includes(op.memory)) {
      applyEffects(sim, then, ctx);
      return;
    }
    state.memories.push(op.memory);
    log(sim, `You remember: ${MEMORY_BY_ID[op.memory].title}.`, 'memory');
    sfx(sim, 'memory');
    openEvent(sim, 'memory', { ...castOnly(ctx), memory: op.memory, then });
  },

  next: (sim, op, ctx) => openEvent(sim, op.next, castOnly(ctx)),

  trader: (sim, op, ctx) => afterDeal(sim, op.trader, ctx.offers),

  roll(sim, op, ctx) {
    applyEffects(sim, (sim.rng.chance(op.roll) ? op.pass : op.fail) ?? [], ctx);
  },

  venture: (sim, op) => setOut(sim, op.venture),

  home: (sim) => comeHome(sim),

  end: (sim, op) => end(sim, op.end),
};

/** Every effect name; content tests check against this. */
export const EFFECT_NAMES = Object.keys(OPS);

/**
 * Applies effects in order. Stops early if one of them ends the game.
 * @param {Sim} sim
 * @param {Effect[]} effects
 * @param {Cast} [ctx]  who `{name}` and `who: 'cast'` refer to
 */
export function applyEffects(sim, effects, ctx = {}) {
  for (const op of effects) {
    if (sim.state.ended) return;
    const [name] = Object.keys(op);
    const run = OPS[name];
    if (!run) throw new Error(`Unknown effect "${name}"`);
    run(sim, op, ctx);
  }
}
