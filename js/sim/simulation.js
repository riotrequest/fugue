import { TIME } from './tuning.js';
import { EXPEDITION_LINES } from './content/lines.js';
import { stepDirector } from './systems/director.js';
import { bandOf, stepFire } from './systems/fire.js';
import { log, vary } from './systems/journal.js';
import { atDawn, stepPeople } from './systems/people.js';
import { stepStory } from './systems/story.js';
import { stepThreat } from './systems/threat.js';
import { isAway, stepTime } from './systems/time.js';
import { stepVitals } from './systems/vitals.js';
import { stepWeather } from './systems/weather.js';
import { stepWork } from './systems/work.js';
import { stepResearch } from './systems/research.js';
import { stepAims } from './systems/aims.js';

/**
 * One step of the world, in a fixed order: the sky, the fire, the player's body,
 * the camp's work and needs, the dark, then the story reacting to all of it.
 * @param {import('./systems/journal.js').Sim} sim
 * @param {number} dt  seconds, at most TIME.maxStep
 */
export function advance(sim, dt) {
  const { state } = sim;
  state.elapsed += dt;

  const phase = stepTime(sim, dt);
  stepWeather(sim, dt);
  stepFire(sim, dt);
  // A roaring fire is seen a long way off (see the first stranger in content/story.js).
  if (state.player.awake && !isAway(state) && bandOf(state) === 'roaring') state.roaring = (state.roaring ?? 0) + dt;
  stepVitals(sim, dt);
  if (state.ended) return;

  stepWork(sim, dt);
  stepResearch(sim, dt);
  stepPeople(sim, dt);
  if (phase === 'dawn') atDawn(sim);
  stepThreat(sim, dt);
  stepStory(sim);
  stepAims(sim);
  stepDirector(sim);
}

/**
 * Plays out the walk home from an expedition: the camp lives through the hours
 * the player was gone, in ordinary steps, before control returns.
 * @param {import('./systems/journal.js').Sim} sim
 */
export function settle(sim) {
  const { state } = sim;
  const { player } = state;
  if (player.awayFor <= 0) return;

  while (player.awayFor > 0 && !state.ended) {
    const dt = Math.min(TIME.maxStep, player.awayFor);
    advance(sim, dt);
    player.awayFor -= dt;
  }
  if (state.ended) return;
  if (state.fire.lit) log(sim, vary(sim, EXPEDITION_LINES.home));
  else log(sim, vary(sim, EXPEDITION_LINES.homeToDark), 'danger');
}
