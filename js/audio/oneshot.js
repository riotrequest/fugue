/**
 * One-shot voices: a tone, a burst of filtered noise, a soft chime built from
 * two tones, and a snap of burning wood built from noise. Each shapes itself
 * with a click-free envelope, stops itself, and disconnects its nodes when it
 * ends.
 */

import { lerp, rand } from './util.js';

/**
 * Fields shared by every one-shot.
 * @typedef {Object} Shot
 * @property {number} at        AudioContext time to begin (clamped to now)
 * @property {number} decay     seconds from peak to silence
 * @property {number} peak      peak gain
 * @property {number} [attack]  seconds from silence to peak
 * @property {number} [pan]     -1 left .. 1 right
 * @property {number} [reverb]  reverb send level, 0..1
 */

/**
 * @typedef {Object} ToneOptions
 * @property {number} freq       Hz
 * @property {number} [freqEnd]  Hz to glide to over the life of the tone
 * @property {OscillatorType} [type]
 */

/**
 * @typedef {Object} NoiseOptions
 * @property {number} freq       filter frequency, Hz
 * @property {number} [freqEnd]  Hz to sweep the filter to
 * @property {BiquadFilterType} [filter]
 * @property {number} [q]
 */

const DEFAULT_ATTACK = 0.004;
/** Envelopes decay to this fraction of their peak (-60 dB) before stopping. */
const ENVELOPE_FLOOR = 0.001;
/** Sources stop this long after their envelope has closed. */
const STOP_PADDING = 0.02;

/** A chime's octave partial, relative to its fundamental. */
const CHIME_PARTIAL_RATIO = 2;
const CHIME_PARTIAL_LEVEL = 0.2;
const CHIME_PARTIAL_DECAY = 0.4;

/**
 * @typedef {Object} SnapOptions
 * @property {number} at       AudioContext time to begin (clamped to now)
 * @property {number} size     0 a faint bright tick .. 1 a full, low crack
 * @property {number} peak     peak gain of a snap of size 1
 * @property {number} [pan]    -1 left .. 1 right
 * @property {number} [reverb] reverb send level, 0..1
 */

/**
 * A wood snap, from the smallest to the largest: as snaps grow they fall in
 * pitch, soften at the front and last longer. Each also varies at random.
 */
const SNAP = {
  /** Level of the smallest snap relative to the largest. */
  minLevel: 0.04,
  hz: [3600, 1200],
  hzSpread: [0.8, 1.25],
  q: [0.8, 2.2],
  attack: [0.0015, 0.005],
  decay: [0.012, 0.07],
  decaySpread: [0.7, 1.3],
};

/** The woody knock under a snap of at least `minSize`: a low, resonant band. */
const KNOCK = {
  minSize: 0.55,
  hz: [230, 520],
  q: 5,
  attack: 0.004,
  decay: [0.05, 0.11],
  /** Relative to the snap; the band is narrow, so little noise passes it. */
  level: 3,
};

/**
 * Routes a started source through an attack/decay envelope (and optional pan
 * and reverb send) to `out`, then schedules its stop and cleanup.
 * @param {import('./engine.js').Engine} engine
 * @param {AudioNode} out
 * @param {AudioScheduledSourceNode} source
 * @param {AudioNode} tail  last node of the source's own chain
 * @param {Shot} shot
 */
function emit(engine, out, source, tail, { at, decay, peak, attack = DEFAULT_ATTACK, pan = 0, reverb = 0 }) {
  const { ctx } = engine;
  const end = at + attack + decay;
  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(0, at);
  envelope.gain.linearRampToValueAtTime(peak, at + attack);
  envelope.gain.exponentialRampToValueAtTime(peak * ENVELOPE_FLOOR, end);
  tail.connect(envelope);

  // A set, because a bare oscillator is its own tail.
  const nodes = new Set([source, tail, envelope]);
  let last = envelope;
  if (pan !== 0) {
    last = ctx.createStereoPanner();
    last.pan.value = pan;
    envelope.connect(last);
    nodes.add(last);
  }
  last.connect(out);
  if (reverb > 0) {
    const send = ctx.createGain();
    send.gain.value = reverb;
    last.connect(send).connect(engine.reverb);
    nodes.add(send);
  }

  source.onended = () => {
    for (const node of nodes) node.disconnect();
  };
  source.stop(end + STOP_PADDING);
}

/**
 * A single enveloped oscillator, optionally gliding in pitch.
 * @param {import('./engine.js').Engine} engine
 * @param {AudioNode} out
 * @param {Shot & ToneOptions} options
 */
export function tone(engine, out, options) {
  const { ctx } = engine;
  const at = Math.max(options.at, ctx.currentTime);
  const oscillator = ctx.createOscillator();
  oscillator.type = options.type ?? 'sine';
  oscillator.frequency.setValueAtTime(options.freq, at);
  if (options.freqEnd) {
    const end = at + (options.attack ?? DEFAULT_ATTACK) + options.decay;
    oscillator.frequency.exponentialRampToValueAtTime(options.freqEnd, end);
  }
  oscillator.start(at);
  emit(engine, out, oscillator, oscillator, { ...options, at });
}

/**
 * An enveloped burst of white noise through one filter, optionally swept.
 * @param {import('./engine.js').Engine} engine
 * @param {AudioNode} out
 * @param {Shot & NoiseOptions} options
 */
export function noiseHit(engine, out, options) {
  const { ctx } = engine;
  const at = Math.max(options.at, ctx.currentTime);
  const source = ctx.createBufferSource();
  source.buffer = engine.noise.white;
  source.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = options.filter ?? 'bandpass';
  filter.Q.value = options.q ?? 1;
  filter.frequency.setValueAtTime(options.freq, at);
  if (options.freqEnd) {
    const end = at + (options.attack ?? DEFAULT_ATTACK) + options.decay;
    filter.frequency.exponentialRampToValueAtTime(options.freqEnd, end);
  }

  source.connect(filter);
  source.start(at, Math.random() * source.buffer.duration);
  emit(engine, out, source, filter, { ...options, at });
}

/**
 * A soft struck note — somewhere between a music box and a felt piano: a sine
 * with a quieter, shorter-lived octave partial.
 * @param {import('./engine.js').Engine} engine
 * @param {AudioNode} out
 * @param {Shot & { freq: number }} options
 */
export function chime(engine, out, options) {
  tone(engine, out, options);
  tone(engine, out, {
    ...options,
    freq: options.freq * CHIME_PARTIAL_RATIO,
    peak: options.peak * CHIME_PARTIAL_LEVEL,
    decay: options.decay * CHIME_PARTIAL_DECAY,
  });
}

/**
 * A snap of burning wood: a short band of noise somewhere between 1 and 4 kHz
 * with a softened front, never a bare click. The larger ones knock.
 * @param {import('./engine.js').Engine} engine
 * @param {AudioNode} out
 * @param {SnapOptions} options
 */
export function woodSnap(engine, out, { at, size, peak, pan, reverb }) {
  noiseHit(engine, out, {
    at,
    freq: lerp(SNAP.hz[0], SNAP.hz[1], size) * rand(SNAP.hzSpread[0], SNAP.hzSpread[1]),
    q: rand(SNAP.q[0], SNAP.q[1]),
    attack: lerp(SNAP.attack[0], SNAP.attack[1], size),
    decay: lerp(SNAP.decay[0], SNAP.decay[1], size) * rand(SNAP.decaySpread[0], SNAP.decaySpread[1]),
    peak: peak * lerp(SNAP.minLevel, 1, size),
    pan,
    reverb,
  });
  if (size < KNOCK.minSize) return;

  const weight = (size - KNOCK.minSize) / (1 - KNOCK.minSize);
  noiseHit(engine, out, {
    at,
    freq: rand(KNOCK.hz[0], KNOCK.hz[1]),
    q: KNOCK.q,
    attack: KNOCK.attack,
    decay: lerp(KNOCK.decay[0], KNOCK.decay[1], weight),
    peak: peak * KNOCK.level * weight,
    pan,
    reverb,
  });
}
