import { VITALS } from '../tuning.js';
import { clamp01 } from '../util.js';
import { DEATH_BY_HARM } from '../content/endings.js';
import { VITAL_DEFS } from '../content/vitals.js';
import { bonus } from './camp.js';
import { end } from './endings.js';
import { intensityOf } from './fire.js';
import { due, log, vary } from './journal.js';
import { coldOf, isAway, phaseOf } from './time.js';
import { dialOf } from './difficulty.js';
import { weatherOf } from './weather.js';

/**
 * The player's body. Food and water drain steadily; warmth drifts toward the
 * comfort level of the camp; health falls while any of the three has failed and
 * mends slowly while all are sound. All values are 0..1 with 1 being well.
 */

/**
 * The warmth a body at the camp settles toward: season, night and weather pull it
 * down; the fire, shelter and clothing push it up. Not clamped.
 */
export function comfortOf(state) {
  const night = phaseOf(state) === 'night' ? VITALS.nightChill : 0;
  return (
    VITALS.ambientBase -
    VITALS.coldChill * coldOf(state) -
    night -
    weatherOf(state).chill * state.weather.intensity * dialOf(state).weather +
    VITALS.fireWarmth * intensityOf(state) +
    bonus(state, 'warmth')
  );
}

/**
 * Changes one vital by `delta`, as an event or action would. Lost health is
 * recorded as a wound, and may be fatal.
 */
export function nudge(sim, id, delta) {
  const { player } = sim.state;
  player.vitals[id] = clamp01(player.vitals[id] + delta);
  if (id === 'health' && delta < 0) {
    player.harm = 'wound';
    checkDeath(sim);
  }
}

function checkDeath(sim) {
  const { player } = sim.state;
  if (player.vitals.health <= 0) end(sim, DEATH_BY_HARM[player.harm]);
}

/** What is hurting the player this moment, as [cause, health lost per second]. */
function harmsOf(vitals) {
  const exposure = 1 - vitals.warmth / VITALS.freezeBelow;
  return [
    ['cold', exposure > 0 ? VITALS.freezeHarm * exposure : 0],
    ['hunger', vitals.food <= 0 ? VITALS.starveHarm : 0],
    ['thirst', vitals.water <= 0 ? VITALS.thirstHarm : 0],
  ];
}

function reveal(sim) {
  const { state } = sim;
  const { vitals } = state.player;
  for (const def of VITAL_DEFS) {
    const value = vitals[def.id];
    const shown = state.revealed.includes(def.id);
    if (!shown && state.player.awake && (def.id === 'warmth' || value < VITALS.revealBelow)) {
      state.revealed.push(def.id);
    }
    if (shown && value < VITALS.dangerBelow && due(sim, `warning:${def.id}`, VITALS.warningGap)) {
      log(sim, vary(sim, def.warnings), 'danger');
    }
  }
  if (vitals.health < VITALS.restBelow) state.flags.hurt = true;
}

export function stepVitals(sim, dt) {
  const { state } = sim;
  const { vitals } = state.player;

  const { hunger } = dialOf(state);
  vitals.food = clamp01(vitals.food - VITALS.foodDrain * hunger * dt);
  vitals.water = clamp01(vitals.water - VITALS.waterDrain * hunger * (weatherOf(state).thirst ?? 1) * dt);

  const target = isAway(state) ? VITALS.awayWarmth : clamp01(comfortOf(state));
  vitals.warmth = clamp01(vitals.warmth + (target - vitals.warmth) * Math.min(1, VITALS.warmthRate * dt));

  const harms = harmsOf(vitals);
  const total = harms.reduce((sum, [, rate]) => sum + rate, 0);
  if (total > 0) {
    vitals.health = clamp01(vitals.health - total * dt);
    state.player.harm = harms.reduce((worst, harm) => (harm[1] > worst[1] ? harm : worst))[0];
    checkDeath(sim);
  } else if (Math.min(vitals.warmth, vitals.food, vitals.water) > VITALS.mendAbove) {
    vitals.health = clamp01(vitals.health + VITALS.mendRate * dt);
  }

  reveal(sim);
}
