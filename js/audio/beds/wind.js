/**
 * Wind: a soft, dark bed of low-passed pink noise that swells and drifts in
 * slow gusts. In ordinary weather it is barely there; only a strong wind
 * opens up enough to be noticed. Winter thins it, and a faint whistle joins.
 *
 * Every modifier of its level (gust, time of day, the scene's quiet) is at
 * most 1, so together they can only ever pull the wind down from WIND_LEVEL;
 * and however wind, gust and cold combine, its cutoff stops at a ceiling.
 */

import { startLoop } from '../noise.js';
import { createEase, lerp, rand } from '../util.js';

/** Down from 0.3 in three halvings after playtesting: the wind was drowning out everything else. */
const WIND_LEVEL = 0.0375;
/** A breath of air remains even when the wind is still. */
const WIND_FLOOR = 0.05;
/** Perceptual curve: light winds stay light. */
const WIND_CURVE = 1.3;
/** By day the wind is this fraction of its night-time level. */
const DAY_LEVEL = 0.7;

/** Body low-pass cutoff, from still air to a gale. */
const BODY_HZ = [220, 700];
const BODY_Q = 0.5;
/** A gust opens the cutoff by a factor in this range; deep winter by up to this factor. */
const GUST_LIFT = [0.85, 1.2];
const COLD_LIFT = 1.3;
/** The cutoff never rises past this: the wind stays dark. */
const BODY_CEILING_HZ = 900;

/** The thin winter whistle, heard only in the gusts of a cold wind. */
const WHISTLE_LEVEL = 0.0025;
const WHISTLE_HZ = [900, 1400];
const WHISTLE_Q = 6;

/** Each gust picks a new strength, lasts this long, and drifts across the field. */
const GUST_STRENGTH = [0.45, 1];
const GUST_SECONDS = [6, 16];
const GUST_PAN = 0.35;
/** Gusts swell and fade over several seconds. */
const GUST_TIME_CONSTANT = 4;

/**
 * @param {import('../engine.js').Engine} engine
 * @returns {import('./fire.js').Bed}
 */
export function createWind(engine) {
  const { ctx, noise } = engine;

  const panner = ctx.createStereoPanner();
  panner.connect(engine.input);

  const bodyFilter = ctx.createBiquadFilter();
  const body = ctx.createGain();
  bodyFilter.type = 'lowpass';
  bodyFilter.frequency.value = BODY_HZ[0];
  bodyFilter.Q.value = BODY_Q;
  body.gain.value = 0;
  bodyFilter.connect(body).connect(panner);
  startLoop(ctx, noise.pink, bodyFilter);

  const whistleFilter = ctx.createBiquadFilter();
  const whistle = ctx.createGain();
  whistleFilter.type = 'bandpass';
  whistleFilter.frequency.value = WHISTLE_HZ[0];
  whistleFilter.Q.value = WHISTLE_Q;
  whistle.gain.value = 0;
  whistleFilter.connect(whistle).connect(panner);
  startLoop(ctx, noise.pink, whistleFilter);

  const easeBody = createEase(body.gain, GUST_TIME_CONSTANT);
  const easeBodyHz = createEase(bodyFilter.frequency, GUST_TIME_CONSTANT);
  const easeWhistle = createEase(whistle.gain, GUST_TIME_CONSTANT);
  const easeWhistleHz = createEase(whistleFilter.frequency, GUST_TIME_CONSTANT);
  const easePan = createEase(panner.pan, GUST_TIME_CONSTANT);

  let gust = GUST_STRENGTH[0];
  let drift = 0;
  let nextGustAt = 0;

  return {
    update({ wind, cold, night, quiet }, now) {
      if (now >= nextGustAt) {
        gust = rand(GUST_STRENGTH[0], GUST_STRENGTH[1]);
        drift = rand(-GUST_PAN, GUST_PAN);
        nextGustAt = now + rand(GUST_SECONDS[0], GUST_SECONDS[1]);
      }

      const strength = WIND_FLOOR + (1 - WIND_FLOOR) * wind ** WIND_CURVE;
      const level = strength * gust * lerp(DAY_LEVEL, 1, night) * quiet;
      const cutoff = lerp(BODY_HZ[0], BODY_HZ[1], wind) * lerp(GUST_LIFT[0], GUST_LIFT[1], gust) * lerp(1, COLD_LIFT, cold);

      easeBody(WIND_LEVEL * level, now);
      easeBodyHz(Math.min(cutoff, BODY_CEILING_HZ), now);
      easeWhistle(WHISTLE_LEVEL * level * cold, now);
      easeWhistleHz(lerp(WHISTLE_HZ[0], WHISTLE_HZ[1], gust), now);
      easePan(drift, now);
    },
  };
}
