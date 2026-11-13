/**
 * What is left of the night: at long, irregular intervals, something far off —
 * an owl-like call, a branch giving way. By day there is nothing at all.
 */

import { noiseHit, tone } from '../oneshot.js';
import { pick, rand } from '../util.js';

/** Sounds only occur once night has properly fallen. */
const NIGHT_THRESHOLD = 0.6;
/** Seconds between chances for a sound, and before the first. */
const GAP_SECONDS = [28, 75];
const FIRST_GAP_SECONDS = 18;
/** Everything here is distant: mostly reverb, anywhere in the field. */
const DISTANCE_REVERB = 0.8;
const DISTANCE_PAN = 0.8;

const OWL = {
  /** Onsets (seconds) of each hoot in a call. */
  patterns: [[0, 0.62], [0, 0.55, 0.8], [0]],
  hz: [330, 390],
  /** Each hoot sags to this fraction of its starting pitch. */
  sag: 0.92,
  attack: 0.07,
  decay: 0.36,
  peak: 0.022,
};

const BRANCH = {
  /** Onsets and relative levels of the crack and its echoing splinters. */
  cracks: [[0, 1], [0.07, 0.45], [0.19, 0.2]],
  hz: [700, 1300],
  q: 2,
  decay: 0.06,
  peak: 0.16,
};

/**
 * @param {import('../engine.js').Engine} engine
 * @param {number} now
 */
function owl(engine, now) {
  const pan = rand(-DISTANCE_PAN, DISTANCE_PAN);
  const freq = rand(OWL.hz[0], OWL.hz[1]);
  for (const onset of pick(OWL.patterns)) {
    tone(engine, engine.input, {
      at: now + onset,
      freq,
      freqEnd: freq * OWL.sag,
      attack: OWL.attack,
      decay: OWL.decay,
      peak: OWL.peak,
      pan,
      reverb: DISTANCE_REVERB,
    });
  }
}

/**
 * @param {import('../engine.js').Engine} engine
 * @param {number} now
 */
function branch(engine, now) {
  const pan = rand(-DISTANCE_PAN, DISTANCE_PAN);
  const freq = rand(BRANCH.hz[0], BRANCH.hz[1]);
  for (const [onset, level] of BRANCH.cracks) {
    noiseHit(engine, engine.input, {
      at: now + onset,
      freq,
      q: BRANCH.q,
      decay: BRANCH.decay,
      peak: BRANCH.peak * level,
      pan,
      reverb: DISTANCE_REVERB,
    });
  }
}

const EVENTS = [owl, branch];

/**
 * @param {import('../engine.js').Engine} engine
 * @returns {import('./fire.js').Bed}
 */
export function createNightlife(engine) {
  let nextAt = engine.ctx.currentTime + FIRST_GAP_SECONDS;

  return {
    update({ night, quiet, ended }, now) {
      if (now < nextAt) return;
      nextAt = now + rand(GAP_SECONDS[0], GAP_SECONDS[1]);
      // `quiet` doubles as the odds: deep winter and snow thin the night out further.
      if (night >= NIGHT_THRESHOLD && !ended && Math.random() < quiet) pick(EVENTS)(engine, now);
    },
  };
}
