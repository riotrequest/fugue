/**
 * The radio mast: a thread of narrow-band static and, every so often, a short
 * group of faint beeps from somewhere off to one side.
 */

import { startLoop } from '../noise.js';
import { tone } from '../oneshot.js';
import { createEase } from '../util.js';

const STATIC_LEVEL = 0.05;
const STATIC_HZ = 2400;
const STATIC_Q = 5;
const STATIC_TIME_CONSTANT = 1.5;

/** Seconds between beep groups, and before the first. */
const GROUP_PERIOD = 11;
const FIRST_GROUP_DELAY = 2;
const BEEPS_PER_GROUP = 3;
const BEEP_SPACING = 0.28;
const BEEP_HZ = 740;
const BEEP_PEAK = 0.016;
const BEEP_ATTACK = 0.01;
const BEEP_DECAY = 0.13;
const BEEP_PAN = 0.5;
const BEEP_REVERB = 0.4;

/**
 * @param {import('../engine.js').Engine} engine
 * @returns {import('./fire.js').Bed}
 */
export function createBeacon(engine) {
  const { ctx, noise } = engine;

  const band = ctx.createBiquadFilter();
  const level = ctx.createGain();
  const panner = ctx.createStereoPanner();
  band.type = 'bandpass';
  band.frequency.value = STATIC_HZ;
  band.Q.value = STATIC_Q;
  level.gain.value = 0;
  panner.pan.value = BEEP_PAN;
  band.connect(level).connect(panner).connect(engine.input);
  startLoop(ctx, noise.white, band);
  const easeStatic = createEase(level.gain, STATIC_TIME_CONSTANT);

  let broadcasting = false;
  let nextGroupAt = 0;

  return {
    update({ beacon }, now) {
      easeStatic(beacon ? STATIC_LEVEL : 0, now);
      if (beacon && !broadcasting) nextGroupAt = now + FIRST_GROUP_DELAY;
      broadcasting = beacon;
      if (!beacon || now < nextGroupAt) return;

      nextGroupAt = now + GROUP_PERIOD;
      for (let i = 0; i < BEEPS_PER_GROUP; i++) {
        tone(engine, engine.input, {
          at: now + i * BEEP_SPACING,
          freq: BEEP_HZ,
          attack: BEEP_ATTACK,
          decay: BEEP_DECAY,
          peak: BEEP_PEAK,
          pan: BEEP_PAN,
          reverb: BEEP_REVERB,
        });
      }
    },
  };
}
