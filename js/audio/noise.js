/**
 * Procedural sample material: seamless looping noise in three colours,
 * pre-rendered grain textures, and slow drift for modulation. Everything is
 * generated once, at unlock.
 */

import { lerp, rand } from './util.js';

/**
 * @typedef {Object} NoiseBuffers
 * @property {AudioBuffer} white flat spectrum: hiss, rain, clicks
 * @property {AudioBuffer} pink  -3 dB/octave: wind, patter
 * @property {AudioBuffer} brown low rumble: flame, roar, sub
 */

const NOISE_SECONDS = 5;
/** The loop's tail is cross-faded into its head over this long. */
const SEAM_SECONDS = 0.3;
/** Every noise buffer is normalised to this RMS so bed levels are comparable. */
const NOISE_RMS = 0.25;
/** Leaky-integrator coefficient for brown noise. */
const BROWN_LEAK = 0.02;

/** @param {Float32Array} data */
function fillWhite(data) {
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
}

/**
 * Paul Kellet's economy pink filter.
 * @param {Float32Array} data
 */
function fillPink(data) {
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99765 * b0 + white * 0.099046;
    b1 = 0.963 * b1 + white * 0.2965164;
    b2 = 0.57 * b2 + white * 1.0526913;
    data[i] = b0 + b1 + b2 + white * 0.1848;
  }
}

/** @param {Float32Array} data */
function fillBrown(data) {
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    last = (last + BROWN_LEAK * (Math.random() * 2 - 1)) / (1 + BROWN_LEAK);
    data[i] = last;
  }
}

/**
 * Renders a mono noise loop whose end flows into its start without a click.
 * @param {BaseAudioContext} ctx
 * @param {(data: Float32Array) => void} fill
 * @returns {AudioBuffer}
 */
function renderLoop(ctx, fill) {
  const length = Math.floor(NOISE_SECONDS * ctx.sampleRate);
  const seam = Math.floor(SEAM_SECONDS * ctx.sampleRate);
  const raw = new Float32Array(length + seam);
  fill(raw);

  // Equal-power blend of the overhang into the head: sample 0 continues
  // directly from where the loop's final sample left off.
  let sumOfSquares = 0;
  for (let i = 0; i < length; i++) {
    if (i < seam) {
      const t = i / seam;
      raw[i] = raw[i] * Math.sqrt(t) + raw[length + i] * Math.sqrt(1 - t);
    }
    sumOfSquares += raw[i] * raw[i];
  }

  const scale = NOISE_RMS / Math.sqrt(sumOfSquares / length);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) channel[i] = raw[i] * scale;
  return buffer;
}

/**
 * @param {BaseAudioContext} ctx
 * @returns {NoiseBuffers}
 */
export function createNoiseBuffers(ctx) {
  return {
    white: renderLoop(ctx, fillWhite),
    pink: renderLoop(ctx, fillPink),
    brown: renderLoop(ctx, fillBrown),
  };
}

/**
 * @typedef {Object} CrackleSpec
 * @property {number} seconds    loop length; use mutually prime-ish lengths so layers never realign
 * @property {number} density    grains per second
 * @property {number} loudness   peak amplitude of the largest grains
 * @property {number} brightness 0..1 one-pole coefficient; 1 leaves grains unfiltered
 * @property {number} skew       exponent skewing grain sizes toward small; higher leaves fewer large grains
 */

/** Amplitude of the smallest grain relative to the largest. */
const GRAIN_MIN_AMPLITUDE = 0.04;
/** Decay time constants (seconds) of the smallest and largest grains. */
const GRAIN_DECAY = [0.0004, 0.004];
/** A grain swells in over this fraction of its decay, so none begins with a click. */
const GRAIN_ATTACK_FRACTION = 0.2;
/** A grain is rendered for this many decay time constants. */
const GRAIN_DECAY_SPANS = 6;
/** Larger grains are duller: their brightness falls to this fraction. */
const GRAIN_LARGE_DULLING = 0.5;
/** Grains are scattered across this much of the stereo field. */
const GRAIN_PAN_SPREAD = 0.7;

/**
 * Renders a stereo loop of fine grains — tiny, soft-edged bursts of filtered
 * noise, dense enough to fuse into a texture (sizzle, falling ash) rather than
 * be heard one by one. Looping one of these costs a single buffer source.
 * Grains wrap around the loop point, so the loop is seamless.
 * @param {BaseAudioContext} ctx
 * @param {CrackleSpec} spec
 * @returns {AudioBuffer}
 */
export function createCrackleBuffer(ctx, spec) {
  const rate = ctx.sampleRate;
  const length = Math.floor(spec.seconds * rate);
  const buffer = ctx.createBuffer(2, length, rate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);
  const grains = Math.round(spec.seconds * spec.density);

  for (let n = 0; n < grains; n++) {
    const size = Math.random() ** spec.skew;
    const amplitude = spec.loudness * lerp(GRAIN_MIN_AMPLITUDE, 1, size);
    const decay = rate * lerp(GRAIN_DECAY[0], GRAIN_DECAY[1], size);
    const attack = decay * GRAIN_ATTACK_FRACTION;
    const smoothing = spec.brightness * lerp(1, GRAIN_LARGE_DULLING, size);
    const angle = (rand(-GRAIN_PAN_SPREAD, GRAIN_PAN_SPREAD) + 1) * (Math.PI / 4);
    const gainLeft = Math.cos(angle);
    const gainRight = Math.sin(angle);
    const start = Math.floor(Math.random() * length);
    const span = Math.floor(decay * GRAIN_DECAY_SPANS);

    let filtered = 0;
    for (let i = 0; i < span; i++) {
      filtered += smoothing * (Math.random() * 2 - 1 - filtered);
      const sample = amplitude * (1 - Math.exp(-i / attack)) * Math.exp(-i / decay) * filtered;
      const at = (start + i) % length;
      left[at] += sample * gainLeft;
      right[at] += sample * gainRight;
    }
  }
  return buffer;
}

/** Drift is a control signal: it needs no more bandwidth than this (Hz). */
const DRIFT_SAMPLE_RATE = 8000;
const DRIFT_PARTIALS = 24;
/** Each partial's amplitude is its frequency raised to this: the slow ones lead. */
const DRIFT_TILT = -0.5;

/**
 * Renders a slow, irregular control signal in -1..1, for modulating a gain so
 * that a bed flutters without ever settling into a rhythm. It is a sum of
 * random-phase sines, each completing a whole number of cycles, so the loop
 * is seamless.
 * @param {BaseAudioContext} ctx
 * @param {number} seconds loop length
 * @param {number} maxHz   fastest movement in the signal
 * @returns {AudioBuffer}
 */
export function createDriftBuffer(ctx, seconds, maxHz) {
  const length = Math.floor(seconds * DRIFT_SAMPLE_RATE);
  const buffer = ctx.createBuffer(1, length, DRIFT_SAMPLE_RATE);
  const data = buffer.getChannelData(0);
  const maxCycles = maxHz * seconds;

  for (let n = 0; n < DRIFT_PARTIALS; n++) {
    // Cycle counts are spread evenly in pitch, from one per loop up to maxHz.
    const cycles = Math.round(maxCycles ** Math.random());
    const step = (2 * Math.PI * cycles) / length;
    const amplitude = cycles ** DRIFT_TILT;
    const phase = rand(0, 2 * Math.PI);
    for (let i = 0; i < length; i++) data[i] += amplitude * Math.sin(i * step + phase);
  }

  let peak = 0;
  for (let i = 0; i < length; i++) peak = Math.max(peak, Math.abs(data[i]));
  for (let i = 0; i < length; i++) data[i] /= peak;
  return buffer;
}

/**
 * Starts a buffer looping forever from a random phase, so that several beds
 * sharing one noise buffer are not correlated.
 * @param {BaseAudioContext} ctx
 * @param {AudioBuffer} buffer
 * @param {AudioNode} destination
 * @returns {AudioBufferSourceNode}
 */
export function startLoop(ctx, buffer, destination) {
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.connect(destination);
  source.start(0, Math.random() * buffer.duration);
  return source;
}
