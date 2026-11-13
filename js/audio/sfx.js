/**
 * One-shot sound effects. Each is a small recipe of tones and noise bursts:
 * short, soft, pitched low or mid, and never harsh.
 */

import { chime, noiseHit, tone, woodSnap } from './oneshot.js';
import { rand } from './util.js';

/**
 * @callback Recipe
 * @param {import('./engine.js').Engine} engine
 * @param {AudioNode} out
 * @param {number} t AudioContext time at which the effect begins
 * @returns {void}
 */

/** A repeat of the same effect within this window is dropped, not stacked. */
const RETRIGGER_GUARD_SECONDS = 0.04;

/** Pitches (Hz) shared with the music, which is in D. */
const D3 = 146.83;
const D4 = 293.66;
const A4 = 440;
const D5 = 587.33;
/** D5, A5, D6, E6, A6: the shimmer of a memory surfacing. */
const MEMORY_PITCHES = [587.33, 880, 1174.66, 1318.51, 1760];
/** C2 against C#2, with F#2 above: the swell of danger. */
const DANGER_PITCHES = [65.41, 69.3, 92.5];
/** Inharmonic partials (ratio, level, decay factor) that make a tone a bell. */
const BELL_PARTIALS = [[2.76, 0.12, 0.3], [5.4, 0.05, 0.12]];

/**
 * A loose handful of wood snaps, as from disturbed embers: the same voice as
 * the fire's own, and mostly small.
 * @param {import('./engine.js').Engine} engine
 * @param {AudioNode} out
 * @param {number} t
 * @param {number} count
 * @param {number} spread seconds over which the snaps fall
 */
function crackles(engine, out, t, count, spread) {
  for (let i = 0; i < count; i++) {
    woodSnap(engine, out, { at: t + rand(0, spread), size: Math.random() ** 2, peak: 1, pan: rand(-0.3, 0.3) });
  }
}

/**
 * A dull knock on wood: a falling thump under a short band of noise.
 * @param {import('./engine.js').Engine} engine
 * @param {AudioNode} out
 * @param {number} t
 * @param {number} hz   pitch of the thump
 * @param {number} peak
 */
function knock(engine, out, t, hz, peak) {
  tone(engine, out, { at: t, freq: hz, freqEnd: hz * 0.55, attack: 0.002, decay: 0.12, peak });
  noiseHit(engine, out, { at: t, freq: hz * 5, q: 1.5, attack: 0.001, decay: 0.045, peak: peak * 2.5 });
}

/**
 * Two soft notes, one after the other.
 * @param {import('./engine.js').Engine} engine
 * @param {AudioNode} out
 * @param {number} t
 * @param {number} first  Hz
 * @param {number} second Hz
 * @param {number} gap    seconds between them
 * @param {number} attack seconds; longer is gentler
 */
function interval(engine, out, t, first, second, gap, attack) {
  const note = { attack, decay: 2.2, peak: 0.07, reverb: 0.6 };
  chime(engine, out, { ...note, at: t, freq: first, pan: -0.15 });
  chime(engine, out, { ...note, at: t + gap, freq: second, pan: 0.15 });
}

/** @type {Readonly<Record<string, Recipe>>} */
const RECIPES = {
  /** A low whoosh of air through the coals, and a few snaps as they settle. */
  stoke(engine, out, t) {
    noiseHit(engine, out, { at: t, freq: 240, freqEnd: 800, q: 0.7, attack: 0.18, decay: 0.7, peak: 1.6 });
    crackles(engine, out, t + 0.15, 5, 0.9);
  },

  /** Flame catching: a soft low bloom opening upward, and the first snaps. */
  ignite(engine, out, t) {
    noiseHit(engine, out, { at: t, filter: 'lowpass', freq: 200, freqEnd: 1200, attack: 0.3, decay: 1, peak: 1 });
    tone(engine, out, { at: t, freq: 70, freqEnd: 110, attack: 0.2, decay: 0.6, peak: 0.08 });
    crackles(engine, out, t + 0.3, 4, 0.9);
  },

  /** An axe into wood. */
  chop(engine, out, t) {
    knock(engine, out, t, 130, 0.16);
    noiseHit(engine, out, { at: t, filter: 'highpass', freq: 2200, attack: 0.001, decay: 0.02, peak: 0.2 });
  },

  /** Hands through leaves and brush. */
  gather(engine, out, t) {
    for (const [delay, hz] of [[0, 2600], [0.1, 3400], [0.21, 2200]]) {
      noiseHit(engine, out, { at: t + delay, freq: hz, q: 0.7, attack: 0.03, decay: 0.12, peak: 0.22, pan: rand(-0.25, 0.25) });
    }
  },

  /** Two knocks: something fixed in place. */
  build(engine, out, t) {
    knock(engine, out, t, 180, 0.12);
    knock(engine, out, t + 0.22, 160, 0.1);
  },

  /** A scrape, then a tick. */
  craft(engine, out, t) {
    noiseHit(engine, out, { at: t, freq: 1700, freqEnd: 2500, q: 2.5, attack: 0.04, decay: 0.16, peak: 0.3 });
    noiseHit(engine, out, { at: t + 0.24, filter: 'highpass', freq: 2800, attack: 0.001, decay: 0.02, peak: 0.25 });
  },

  /** Three small, dull bites. */
  eat(engine, out, t) {
    for (const [delay, hz] of [[0, 700], [0.16, 620], [0.33, 760]]) {
      noiseHit(engine, out, { at: t + delay, freq: hz, q: 1.4, attack: 0.004, decay: 0.06, peak: 0.4 });
    }
  },

  /** Three rising swallows of water. */
  drink(engine, out, t) {
    for (const [delay, hz] of [[0, 300], [0.13, 340], [0.26, 390]]) {
      tone(engine, out, { at: t + delay, freq: hz, freqEnd: hz * 1.6, attack: 0.01, decay: 0.09, peak: 0.07 });
    }
  },

  /** A new voice: two soft notes, a fourth apart. */
  arrive(engine, out, t) {
    interval(engine, out, t, A4, D5, 0.24, 0.01);
  },

  /** A low, dissonant swell. */
  danger(engine, out, t) {
    for (const hz of DANGER_PITCHES) {
      tone(engine, out, { at: t, type: 'triangle', freq: hz, attack: 0.9, decay: 1.8, peak: 0.1, reverb: 0.3 });
    }
  },

  /** A glassy shimmer, rising, deep in reverb. */
  memory(engine, out, t) {
    MEMORY_PITCHES.forEach((hz, i) => {
      tone(engine, out, {
        at: t + i * 0.075,
        freq: hz,
        attack: 0.02,
        decay: 1.5,
        peak: 0.03,
        pan: i % 2 ? 0.4 : -0.4,
        reverb: 0.9,
      });
    });
  },

  /** A low tone, falling away. */
  death(engine, out, t) {
    tone(engine, out, { at: t, freq: D3 * 1.335, freqEnd: D3 / 1.8, attack: 0.08, decay: 2.6, peak: 0.12, reverb: 0.5 });
    tone(engine, out, { at: t, freq: D3 * 0.667, freqEnd: D3 / 3.6, attack: 0.08, decay: 2.6, peak: 0.1 });
  },

  /** A muted, dull tick: not that, not now. */
  deny(engine, out, t) {
    tone(engine, out, { at: t, freq: 150, freqEnd: 105, attack: 0.002, decay: 0.07, peak: 0.1 });
    noiseHit(engine, out, { at: t, filter: 'lowpass', freq: 420, attack: 0.001, decay: 0.03, peak: 0.3 });
  },

  /** A gentle rising fifth. */
  dawn(engine, out, t) {
    interval(engine, out, t, D4, A4, 0.6, 0.12);
  },

  /** The same fifth, falling. */
  dusk(engine, out, t) {
    interval(engine, out, t, A4, D4, 0.6, 0.12);
  },

  /** A single soft bell. */
  unlock(engine, out, t) {
    chime(engine, out, { at: t, freq: D5, attack: 0.006, decay: 2.8, peak: 0.08, reverb: 0.7 });
    for (const [ratio, level, decay] of BELL_PARTIALS) {
      tone(engine, out, { at: t, freq: D5 * ratio, attack: 0.004, decay: 2.8 * decay, peak: 0.08 * level, reverb: 0.7 });
    }
  },

  /** A barely audible interface tick. */
  click(engine, out, t) {
    tone(engine, out, { at: t, freq: 820, freqEnd: 600, attack: 0.001, decay: 0.022, peak: 0.022 });
  },
};

/** Every effect name `play` understands. */
export const SFX_NAMES = Object.freeze(Object.keys(RECIPES));

/**
 * @param {import('./engine.js').Engine} engine
 * @returns {{ play(name: string): void }}
 */
export function createSfx(engine) {
  /** @type {Map<string, number>} */
  const lastPlayedAt = new Map();

  return {
    play(name) {
      if (!Object.hasOwn(RECIPES, name)) return;
      const now = engine.ctx.currentTime;
      if (now - (lastPlayedAt.get(name) ?? -Infinity) < RETRIGGER_GUARD_SECONDS) return;
      lastPlayedAt.set(name, now);
      RECIPES[name](engine, engine.input, now);
    },
  };
}
