/**
 * The fire. Most of it is a soft, continuous body: a warm band of flame noise
 * over a low roar, fluttering slowly and never quite the same way twice, with
 * a fine, quiet sizzle on top. Distinct snaps of wood are live one-shots, and
 * they are rare: they come in loose clusters with long gaps between, and most
 * are barely there.
 */

import { createCrackleBuffer, createDriftBuffer, startLoop } from '../noise.js';
import { woodSnap } from '../oneshot.js';
import { createEase, lerp, rand, smoothstep } from '../util.js';

/**
 * @typedef {Object} Bed
 * @property {(scene: import('../scene.js').Scene, now: number) => void} update
 */

/** Seconds for the bed to follow a change in the fire. */
const FIRE_TIME_CONSTANT = 0.6;

/** The flame itself: a broad, warm band of brown noise that rises as it grows.
 *  Halved from 0.48 after playtesting: its steady rush read as a loud wind. */
const BODY_LEVEL = 0.24;
const BODY_HZ = [300, 480];
const BODY_Q = 0.6;
/** Fire levels between which the body fades in, and the curve it follows. */
const BODY_ONSET = [0.12, 1];
const BODY_CURVE = 0.5;

/** The low roar under a fire that is properly burning. */
const ROAR_LEVEL = 0.065;
const ROAR_CUTOFF_HZ = [110, 260];
const ROAR_ONSET = [0.3, 1];
const ROAR_CURVE = 1.5;

/** Body, roar and sizzle swell and sink together by this much, irregularly. */
const FLUTTER = { seconds: 13.7, maxHz: 6, depth: 0.45 };

/** The sizzle: a dense texture of grains too small and soft to count. */
const SIZZLE_LEVEL = 0.15;
/** @type {import('../noise.js').CrackleSpec} */
const SIZZLE_GRAINS = { seconds: 11.9, density: 80, loudness: 0.3, brightness: 0.8, skew: 5 };
const SIZZLE_ONSET = [0.15, 1];
const SIZZLE_HIGHPASS_HZ = 1600;
/** A low fire sizzles dully, a high one brightly. */
const SIZZLE_CUTOFF_HZ = [3000, 7000];

/** Snaps: none below this fire level. */
const SNAP_MIN_FIRE = 0.08;
/** Mean seconds between clusters of snaps, from embers to a full blaze. */
const SNAP_GAP_SECONDS = [30, 1.2];
/** Each snap has this chance of being followed closely by another, up to a limit. */
const SNAP_FOLLOW_CHANCE = 0.4;
const SNAP_CLUSTER_MAX = 4;
const SNAP_FOLLOW_SECONDS = [0.05, 0.5];
/** Exponent skewing snap sizes toward small: mostly ticks, the odd crack. */
const SNAP_SIZE_SKEW = 2;
/** Peak of the largest possible snap, from embers to a full blaze. */
const SNAP_PEAK = [0.5, 3];
const SNAP_PAN = 0.4;
const SNAP_REVERB = 0.05;

/**
 * @param {import('../engine.js').Engine} engine
 * @returns {Bed}
 */
export function createFire(engine) {
  const { ctx, noise } = engine;

  const flutter = ctx.createGain();
  const flutterDepth = ctx.createGain();
  flutterDepth.gain.value = FLUTTER.depth;
  flutterDepth.connect(flutter.gain);
  startLoop(ctx, createDriftBuffer(ctx, FLUTTER.seconds, FLUTTER.maxHz), flutterDepth);
  flutter.connect(engine.input);

  /**
   * A looping source through one filter into a silent gain.
   * @param {AudioBuffer} buffer
   * @param {AudioNode} out
   * @param {BiquadFilterType} type
   * @param {number} hz
   * @param {number} [q]
   */
  const layer = (buffer, out, type, hz, q) => {
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    filter.type = type;
    filter.frequency.value = hz;
    if (q !== undefined) filter.Q.value = q;
    gain.gain.value = 0;
    filter.connect(gain).connect(out);
    startLoop(ctx, buffer, filter);
    return {
      easeLevel: createEase(gain.gain, FIRE_TIME_CONSTANT),
      easeHz: createEase(filter.frequency, FIRE_TIME_CONSTANT),
    };
  };

  const body = layer(noise.brown, flutter, 'bandpass', BODY_HZ[0], BODY_Q);
  const roar = layer(noise.brown, flutter, 'lowpass', ROAR_CUTOFF_HZ[0]);

  const sizzleHighpass = ctx.createBiquadFilter();
  sizzleHighpass.type = 'highpass';
  sizzleHighpass.frequency.value = SIZZLE_HIGHPASS_HZ;
  sizzleHighpass.connect(flutter);
  const sizzle = layer(createCrackleBuffer(ctx, SIZZLE_GRAINS), sizzleHighpass, 'lowpass', SIZZLE_CUTOFF_HZ[0]);

  let nextSnapAt = ctx.currentTime + SNAP_GAP_SECONDS[1];

  /**
   * A loose cluster of snaps: usually one, sometimes a few in quick succession.
   * @param {number} fire
   * @param {number} now
   */
  function snaps(fire, now) {
    let at = now;
    for (let n = 0; n < SNAP_CLUSTER_MAX; n++) {
      woodSnap(engine, engine.input, {
        at,
        size: Math.random() ** SNAP_SIZE_SKEW,
        peak: lerp(SNAP_PEAK[0], SNAP_PEAK[1], fire),
        pan: rand(-SNAP_PAN, SNAP_PAN),
        reverb: SNAP_REVERB,
      });
      if (Math.random() >= SNAP_FOLLOW_CHANCE) return;
      at += rand(SNAP_FOLLOW_SECONDS[0], SNAP_FOLLOW_SECONDS[1]);
    }
  }

  return {
    update({ fire }, now) {
      body.easeLevel(BODY_LEVEL * smoothstep(BODY_ONSET[0], BODY_ONSET[1], fire) ** BODY_CURVE, now);
      body.easeHz(lerp(BODY_HZ[0], BODY_HZ[1], fire), now);
      roar.easeLevel(ROAR_LEVEL * smoothstep(ROAR_ONSET[0], ROAR_ONSET[1], fire) ** ROAR_CURVE, now);
      roar.easeHz(lerp(ROAR_CUTOFF_HZ[0], ROAR_CUTOFF_HZ[1], fire), now);
      sizzle.easeLevel(SIZZLE_LEVEL * smoothstep(SIZZLE_ONSET[0], SIZZLE_ONSET[1], fire), now);
      sizzle.easeHz(lerp(SIZZLE_CUTOFF_HZ[0], SIZZLE_CUTOFF_HZ[1], fire), now);

      if (now < nextSnapAt) return;
      if (fire >= SNAP_MIN_FIRE) snaps(fire, now);
      // Exponentially distributed gaps: some clusters all but touch, some waits are long.
      const meanGap = SNAP_GAP_SECONDS[0] * (SNAP_GAP_SECONDS[1] / SNAP_GAP_SECONDS[0]) ** fire;
      nextSnapAt = now - meanGap * Math.log(1 - Math.random());
    },
  };
}
