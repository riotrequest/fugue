import { THREAT } from '../tuning.js';
import { clamp01 } from '../util.js';
import { bonus } from './camp.js';
import { intensityOf } from './fire.js';
import { sfx } from './journal.js';
import { openEvent } from './modal.js';
import { countIn } from './people.js';
import { coldOf, isAway, phaseOf } from './time.js';
import { weatherOf } from './weather.js';
import { dialOf } from './difficulty.js';

/**
 * The things in the tree line. Threat builds at night, fastest when the fire is
 * low, and drains by day or before a bright fire. Guards, a palisade and a tower
 * slow it; fog and ash quicken it. At 1 it comes into the camp.
 */

/** Threat gained (or, if negative, lost) per second. */
function driftOf(state) {
  const fire = intensityOf(state);
  if (phaseOf(state) !== 'night') return -THREAT.dayFade;

  const darkness = Math.max(0, THREAT.safeFire - fire) / THREAT.safeFire;
  const build = THREAT.drift * coldOf(state) + THREAT.darkRise * darkness;
  const watch = 1 + countIn(state, 'guard') * THREAT.guardPower * (1 + bonus(state, 'watch'));
  const ward = 1 - Math.min(1, bonus(state, 'ward'));
  const calm = fire >= THREAT.brightFire ? THREAT.brightFade : 0;
  return (build * weatherOf(state).dread * ward * dialOf(state).threat) / watch - calm;
}

export function stepThreat(sim, dt) {
  const { state } = sim;
  if (state.chapter < THREAT.fromChapter) return;

  state.threat = clamp01(state.threat + driftOf(state) * dt);
  if (state.threat >= 1 && !state.event && !isAway(state)) {
    sfx(sim, 'danger');
    openEvent(sim, 'treeline');
  }
}
