/**
 * The shared signal path: one mix bus, a generated-impulse reverb, a gentle
 * compressor, and two output stages.
 *
 *   beds, music, sfx ─┬─────────────► input ─► compressor ─► output ─► scene ─► speakers
 *                     └─► reverb ─► convolver ─┘             (volume,   (fade in,
 *                                                             mute,      ending)
 *                                                             pause)
 */

import { createNoiseBuffers } from './noise.js';

/**
 * @typedef {Object} Engine
 * @property {AudioContext} ctx
 * @property {AudioNode} input   everything audible connects here
 * @property {AudioNode} reverb  connect here (through a send gain) for space
 * @property {import('./noise.js').NoiseBuffers} noise
 * @property {(level: number, timeConstant?: number) => void} setOutput  volume/mute/pause stage, 0..1
 * @property {(level: number, timeConstant: number) => void} setScene  story fade stage, 0..1
 */

/** Light glue only: the mix is quiet, so this mostly catches stacked one-shots. */
const COMPRESSOR = { threshold: -16, knee: 14, ratio: 3, attack: 0.02, release: 0.25 };
/**
 * Trim applied after the compressor, under the player's volume. This is the
 * background of a reading game: even at full volume it should sit well under
 * anything else the machine is playing.
 */
const MASTER_LEVEL = 0.7;
/** Default time constant (seconds) of changes at the output stage. */
const OUTPUT_TIME_CONSTANT = 0.08;

const REVERB_SECONDS = 2.8;
const REVERB_PREDELAY_SECONDS = 0.012;
/** The tail has fallen by this factor (-60 dB) at REVERB_SECONDS. */
const REVERB_FLOOR = 0.001;
/** One-pole coefficients darkening the tail from its start to its end. */
const REVERB_BRIGHT_START = 0.6;
const REVERB_BRIGHT_END = 0.06;
const REVERB_RETURN_LEVEL = 0.7;

/** @returns {typeof AudioContext|null} */
export function audioContextConstructor() {
  return globalThis.AudioContext ?? globalThis.webkitAudioContext ?? null;
}

/**
 * A stereo impulse response: decaying noise that grows darker as it fades,
 * like sound dying away among trees.
 * @param {BaseAudioContext} ctx
 * @returns {AudioBuffer}
 */
function createImpulse(ctx) {
  const rate = ctx.sampleRate;
  const length = Math.floor(REVERB_SECONDS * rate);
  const predelay = Math.floor(REVERB_PREDELAY_SECONDS * rate);
  const decayRate = Math.log(REVERB_FLOOR) / (length - predelay);
  const impulse = ctx.createBuffer(2, length, rate);

  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    let filtered = 0;
    for (let i = predelay; i < length; i++) {
      const progress = (i - predelay) / (length - predelay);
      const brightness = REVERB_BRIGHT_START + (REVERB_BRIGHT_END - REVERB_BRIGHT_START) * progress;
      filtered += brightness * (Math.random() * 2 - 1 - filtered);
      data[i] = filtered * Math.exp(decayRate * (i - predelay));
    }
  }
  return impulse;
}

/**
 * Builds the master chain on a context. Both output stages start silent.
 * @param {AudioContext} ctx
 * @returns {Engine}
 */
export function createEngine(ctx) {
  const input = ctx.createGain();
  const compressor = ctx.createDynamicsCompressor();
  const output = ctx.createGain();
  const scene = ctx.createGain();

  for (const [name, value] of Object.entries(COMPRESSOR)) compressor[name].value = value;
  output.gain.value = 0;
  scene.gain.value = 0;
  input.connect(compressor).connect(output).connect(scene).connect(ctx.destination);

  const reverb = ctx.createGain();
  const convolver = ctx.createConvolver();
  const reverbReturn = ctx.createGain();
  convolver.buffer = createImpulse(ctx);
  reverbReturn.gain.value = REVERB_RETURN_LEVEL;
  reverb.connect(convolver).connect(reverbReturn).connect(input);

  return {
    ctx,
    input,
    reverb,
    noise: createNoiseBuffers(ctx),
    setOutput(level, timeConstant = OUTPUT_TIME_CONSTANT) {
      output.gain.setTargetAtTime(level * MASTER_LEVEL, ctx.currentTime, timeConstant);
    },
    setScene(level, timeConstant) {
      scene.gain.setTargetAtTime(level, ctx.currentTime, timeConstant);
    },
  };
}
