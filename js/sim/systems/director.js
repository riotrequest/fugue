import { DIRECTOR } from '../tuning.js';
import { ARRIVALS, INCIDENTS } from '../content/events.js';
import { AMBIENT_LINES, TURNED_AWAY_LINES, VOICE_LINES } from '../content/lines.js';
import { bedsOf } from './camp.js';
import { meets } from './conditions.js';
import { intensityOf } from './fire.js';
import { log, vary } from './journal.js';
import { castable, castFor, openEvent } from './modal.js';
import { MOMENTS } from '../content/moments.js';
import { fill } from '../util.js';
import { applyEffects } from './effects.js';
import { startChain, stepChains } from './chains.js';
import { isAway, phaseOf } from './time.js';
import { stepTrader } from './trade.js';

/**
 * Pacing of everything that is not the player's doing: who finds the fire, what
 * befalls the camp, and the small lines of weather and talk in between. Each
 * runs on its own timer, re-rolled every time it fires.
 *
 * @typedef {import('./journal.js').Sim} Sim
 */

const after = (sim, [min, max]) => sim.state.elapsed + sim.rng.range(min, max);

/** Draws a line from whichever conditional pools apply, larger pools more often. */
function drawLine(sim, pools) {
  const open = pools.filter((pool) => meets(sim.state, pool.when));
  return vary(sim, sim.rng.weighted(open, (pool) => pool.lines.length).lines);
}

function ambience(sim) {
  const { state } = sim;
  if (state.elapsed < state.timers.ambient) return;
  state.timers.ambient = after(sim, DIRECTOR.ambientGap);
  log(sim, drawLine(sim, AMBIENT_LINES));
}

function talk(sim) {
  const { state } = sim;
  if (state.people.length === 0 || state.elapsed < state.timers.voice) return;
  state.timers.voice = after(sim, DIRECTOR.voiceGap);
  log(sim, `${sim.rng.pick(state.people).name}: “${drawLine(sim, VOICE_LINES)}”`, 'voice');
}

/**
 * Someone would have joined but every bed is taken: say so now and then, so the
 * player learns that more roofs mean more people. Draws nothing from the rng,
 * so it leaves the rest of the run unchanged.
 */
function turnAway(sim) {
  const { state } = sim;
  if (state.elapsed < (state.timers.turnedAway ?? 0)) return;
  state.timers.turnedAway = state.elapsed + DIRECTOR.turnedAwayGap;
  log(sim, TURNED_AWAY_LINES[Math.floor(state.elapsed) % TURNED_AWAY_LINES.length], 'warn');
}

/** Strangers come out of the dark toward a fire bright enough to see, if there is a bed. */
function arrival(sim) {
  const { state } = sim;
  const waiting = state.flags.met && state.elapsed >= state.timers.arrival;
  const findable = intensityOf(state) >= DIRECTOR.arrivalFire && phaseOf(state) !== 'day';
  if (!waiting || !findable) return;
  if (state.people.length >= bedsOf(state)) {
    turnAway(sim);
    return;
  }

  state.timers.arrival = after(sim, DIRECTOR.arrivalGap);
  const options = ARRIVALS.filter((def) => meets(state, def.when) && castable(state, def));
  openEvent(sim, sim.rng.weighted(options, (def) => def.weight ?? 1).id);
}

/** Seconds before the same moment may happen again, unless it says otherwise. */
const MOMENT_REPEAT = 1500;

/**
 * Small happenings told in the log: a child's laugh, a fox at the midden, two
 * people sharing a coat. No card and no choice; some leave a mark (a little
 * trust, a bond, a handful of food).
 */
function moment(sim) {
  const { state, rng } = sim;
  if (state.elapsed < (state.timers.moment ?? DIRECTOR.firstMoment)) return;
  state.timers.moment = after(sim, DIRECTOR.momentGap);
  const options = MOMENTS.filter((def) => {
    const last = state.seen[`moment:${def.id}`];
    const rested = last === undefined || state.elapsed - last >= (def.every ?? MOMENT_REPEAT);
    return rested && meets(state, def.when) && castable(state, def);
  });
  if (options.length === 0) return;
  const def = rng.weighted(options, (option) => option.weight ?? 1);
  state.seen[`moment:${def.id}`] = state.elapsed;
  const ctx = castFor(sim, def);
  const text = Array.isArray(def.text) ? vary(sim, def.text) : def.text;
  log(sim, fill(text, ctx), def.tone);
  applyEffects(sim, def.effects ?? [], ctx);
}

/** Whether the camp has had a breath since the last card closed. */
const calm = (state) => state.elapsed >= (state.timers.calm ?? 0);

function incident(sim) {
  const { state } = sim;
  if (state.elapsed < state.timers.incident || !calm(state)) return;
  state.timers.incident = after(sim, DIRECTOR.incidentGap);
  // Now and then the turn goes to a longer story instead.
  if (sim.rng.chance(DIRECTOR.chainChance) && startChain(sim)) return;

  const options = INCIDENTS.filter((def) => {
    const last = state.seen[def.id];
    const rested = last === undefined || state.elapsed - last >= (def.every ?? DIRECTOR.incidentRepeat);
    return rested && meets(state, def.when) && castable(state, def);
  });
  if (options.length > 0) openEvent(sim, sim.rng.weighted(options, (def) => def.weight ?? 1).id);
}

/** @param {Sim} sim */
export function stepDirector(sim) {
  const { state } = sim;
  if (!state.player.awake || isAway(state)) return;

  ambience(sim);
  talk(sim);
  if (!state.event) moment(sim);
  if (!state.event && calm(state)) stepChains(sim);
  if (!state.event) arrival(sim);
  if (!state.event) incident(sim);
  if (!state.event) stepTrader(sim);
}
