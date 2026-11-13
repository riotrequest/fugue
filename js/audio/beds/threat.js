/**
 * Threat: something in the tree line. A low drone whose voices beat against
 * one another, over sub rumble, creeping in as danger grows.
 */

import { startLoop } from '../noise.js';
import { createEase, lerp } from '../util.js';

/**
 * Drone voices: a low A, a second a hair sharp of it (a slow, queasy beat),
 * and a faint tritone above.
 * @type {ReadonlyArray<{ hz: number, type: OscillatorType, level: number }>}
 */
const DRONE_VOICES = [
  { hz: 55, type: 'sine', level: 0.5 },
  { hz: 55.6, type: 'sine', level: 0.45 },
  { hz: 77.78, type: 'triangle', level: 0.16 },
];

const THREAT_LEVEL = 0.16;
/** Low threat stays almost subliminal. */
const THREAT_CURVE = 1.6;
const RUMBLE_LEVEL = 0.9;
/** The drone opens up as the threat rises. */
const CUTOFF_HZ = [90, 260];
/** A slow swell so the drone never sits still. */
const SWELL = { hz: 0.11, depth: 0.25 };
/** Threat arrives and leaves slowly. */
const THREAT_TIME_CONSTANT = 3;

/**
 * @param {import('../engine.js').Engine} engine
 * @returns {import('./fire.js').Bed}
 */
export function createThreat(engine) {
  const { ctx, noise } = engine;

  const level = ctx.createGain();
  level.gain.value = 0;
  level.connect(engine.input);

  const swell = ctx.createGain();
  const lfo = ctx.createOscillator();
  const lfoDepth = ctx.createGain();
  lfo.frequency.value = SWELL.hz;
  lfoDepth.gain.value = SWELL.depth;
  lfo.connect(lfoDepth).connect(swell.gain);
  lfo.start();
  swell.connect(level);

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = CUTOFF_HZ[0];
  lowpass.connect(swell);

  for (const voice of DRONE_VOICES) {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = voice.type;
    oscillator.frequency.value = voice.hz;
    gain.gain.value = voice.level;
    oscillator.connect(gain).connect(lowpass);
    oscillator.start();
  }

  const rumble = ctx.createGain();
  rumble.gain.value = RUMBLE_LEVEL;
  rumble.connect(lowpass);
  startLoop(ctx, noise.brown, rumble);

  const easeLevel = createEase(level.gain, THREAT_TIME_CONSTANT);
  const easeCutoff = createEase(lowpass.frequency, THREAT_TIME_CONSTANT);

  return {
    update({ threat }, now) {
      easeLevel(THREAT_LEVEL * threat ** THREAT_CURVE, now);
      easeCutoff(lerp(CUTOFF_HZ[0], CUTOFF_HZ[1], threat), now);
    },
  };
}
