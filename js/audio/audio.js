/**
 * Fugue's procedural audio: every sound is synthesised with the Web Audio API;
 * there are no audio files.
 *
 * Usage:
 *   const audio = createAudio();
 *   button.addEventListener('click', () => audio.unlock());  // a user gesture
 *   audio.update(view, dt);                                  // from the game loop
 *   audio.sfx('stoke');
 *
 * Audio is strictly optional. Where the Web Audio API is missing, or if
 * anything in it throws, every method quietly does nothing.
 */

import { createAmbience } from './ambience.js';
import { audioContextConstructor, createEngine } from './engine.js';
import { createMusic } from './music.js';
import { readScene } from './scene.js';
import { createSfx } from './sfx.js';
import { clamp01 } from './util.js';

/**
 * @typedef {Object} Audio
 * @property {() => void} unlock
 *   Call from a user gesture. Idempotent. Starts everything silent and fades in.
 * @property {(view?: import('./scene.js').SceneView|null, dt?: number) => void} update
 *   Eases the soundscape toward the view. Cheap; safe at any time. `dt` is
 *   accepted for symmetry with the game loop but unused: the audio clock keeps time.
 * @property {(name: string) => void} sfx
 *   Plays a one-shot. Unknown names are ignored.
 * @property {(muted: boolean) => void} setMuted
 * @property {(paused: boolean) => void} setPaused
 *   Fades the whole mix out and holds it, or fades it back in. While paused
 *   nothing new is scheduled. Independent of mute and volume; idempotent.
 * @property {() => boolean} isMuted
 * @property {(volume: number) => void} setVolume  0..1
 */

/**
 * @typedef {Object} Rig
 * @property {import('./engine.js').Engine} engine
 * @property {import('./beds/fire.js').Bed} ambience
 * @property {import('./beds/fire.js').Bed} music
 * @property {{ play(name: string): void }} sfx
 */

const DEFAULT_VOLUME = 0.7;
/** The scene is re-read at most this often (seconds), however often update() runs. */
const CONTROL_INTERVAL = 0.1;
/** Time constants (seconds) of the fade in at unlock and the fade out at the end. */
const FADE_IN_TIME_CONSTANT = 1.2;
const ENDING_TIME_CONSTANT = 5;
/** Seconds over which the mix fades out on pause, and back in on resume. */
const PAUSE_FADE_SECONDS = 0.4;
const RESUME_FADE_SECONDS = 0.6;
/** A fade is all but complete (-35 dB) after this many time constants. */
const FADE_SPANS = 4;
/** A hidden or paused mix fades out, then its context is suspended after this long (ms). */
const SUSPEND_DELAY_MS = 500;

/**
 * @param {typeof AudioContext} AudioContextConstructor
 * @returns {Rig}
 */
function createRig(AudioContextConstructor) {
  const ctx = new AudioContextConstructor();
  try {
    const engine = createEngine(ctx);
    return {
      engine,
      ambience: createAmbience(engine),
      music: createMusic(engine),
      sfx: createSfx(engine),
    };
  } catch (error) {
    release(ctx);
    throw error;
  }
}

/**
 * Closes a context, ignoring a refusal: this only ever runs on a failure path.
 * @param {AudioContext} ctx
 */
function release(ctx) {
  try {
    ctx.close()?.catch(() => {});
  } catch {
    // Already closed, or never able to close.
  }
}

/** @returns {Audio} */
export function createAudio() {
  const AudioContextConstructor = audioContextConstructor();

  /** @type {Rig|null} */
  let rig = null;
  /** Set if audio ever fails; from then on every method is a no-op. */
  let broken = false;
  let muted = false;
  let volume = DEFAULT_VOLUME;
  let hidden = false;
  let paused = false;
  let ended = false;
  let lastControlAt = -Infinity;
  /** @type {ReturnType<typeof setTimeout>|undefined} */
  let suspendTimer;

  /** @param {number} [timeConstant] seconds; the engine's default when omitted */
  const applyOutput = (timeConstant) => rig?.engine.setOutput(muted || hidden || paused ? 0 : volume, timeConstant);

  /**
   * Runs audio work; any failure retires audio rather than reaching the game.
   * @param {() => void} work
   */
  function attempt(work) {
    try {
      work();
    } catch {
      retire();
    }
  }

  function retire() {
    broken = true;
    clearTimeout(suspendTimer);
    globalThis.document?.removeEventListener('visibilitychange', onVisibilityChange);
    if (rig) release(rig.engine.ctx);
    rig = null;
  }

  /**
   * Runs the audio clock only while the mix can be heard: a hidden or paused
   * mix is given time to fade, then its context is suspended, which also
   * holds the music and every bed exactly where they were.
   */
  function syncClock() {
    clearTimeout(suspendTimer);
    if (!rig) return;
    const { ctx } = rig.engine;
    if (hidden || paused) {
      suspendTimer = setTimeout(() => ctx.suspend()?.catch(() => {}), SUSPEND_DELAY_MS);
    } else if (ctx.state !== 'running') {
      ctx.resume()?.catch(() => {});
    }
  }

  function onVisibilityChange() {
    hidden = document.hidden;
    attempt(() => {
      syncClock();
      applyOutput();
    });
  }

  return {
    unlock() {
      if (!AudioContextConstructor || broken) return;
      attempt(() => {
        if (!rig) {
          rig = createRig(AudioContextConstructor);
          rig.engine.setScene(1, FADE_IN_TIME_CONSTANT);
          applyOutput();
          globalThis.document?.addEventListener('visibilitychange', onVisibilityChange);
        }
        syncClock();
      });
    },

    update(view) {
      if (!rig || paused) return;
      const now = rig.engine.ctx.currentTime;
      if (now - lastControlAt < CONTROL_INTERVAL) return;
      lastControlAt = now;
      attempt(() => {
        const scene = readScene(view);
        if (scene.ended !== ended) {
          ended = scene.ended;
          rig.engine.setScene(ended ? 0 : 1, ended ? ENDING_TIME_CONSTANT : FADE_IN_TIME_CONSTANT);
        }
        rig.ambience.update(scene, now);
        rig.music.update(scene, now);
      });
    },

    sfx(name) {
      if (!rig || muted || hidden || paused) return;
      attempt(() => rig.sfx.play(name));
    },

    setMuted(value) {
      muted = Boolean(value);
      attempt(applyOutput);
    },

    isMuted() {
      return muted;
    },

    setPaused(value) {
      const next = Boolean(value);
      if (next === paused) return;
      paused = next;
      attempt(() => {
        syncClock();
        applyOutput((paused ? PAUSE_FADE_SECONDS : RESUME_FADE_SECONDS) / FADE_SPANS);
      });
    },

    setVolume(value) {
      const level = Number(value);
      if (!Number.isFinite(level)) return;
      volume = clamp01(level);
      attempt(applyOutput);
    },
  };
}
