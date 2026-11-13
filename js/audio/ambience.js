/**
 * The world's sound beds, driven together from one scene.
 */

import { createBeacon } from './beds/signal.js';
import { createFire } from './beds/fire.js';
import { createNightlife } from './beds/nightlife.js';
import { createThreat } from './beds/threat.js';
import { createWeather } from './beds/weather.js';
import { createWind } from './beds/wind.js';

/**
 * Level of the beds as a whole, dry and reverberant alike. They are the
 * background of the background: this keeps them under the music and the
 * effects, which reach the mix directly.
 */
const AMBIENCE_LEVEL = 0.45;

/** Every bed, by the name its trim goes by. */
const BEDS = {
  fire: createFire,
  wind: createWind,
  weather: createWeather,
  threat: createThreat,
  signal: createBeacon,
  nightlife: createNightlife,
};

/**
 * Builds every bed, silent. Each eases toward the scene on `update`.
 * @param {import('./engine.js').Engine} engine
 * @returns {import('./beds/fire.js').Bed}
 */
export function createAmbience(engine) {
  const { ctx } = engine;
  const input = ctx.createGain();
  const reverb = ctx.createGain();
  input.gain.value = AMBIENCE_LEVEL;
  reverb.gain.value = AMBIENCE_LEVEL;
  input.connect(engine.input);
  reverb.connect(engine.reverb);

  // Each bed gets its own trim, dry and reverberant, so one can be turned up or
  // down on its own. They are reachable from the browser console for tuning by
  // ear: `fugueMix.fire = 0.5` halves the fire; `fugueMix` lists every level.
  const mix = {};
  const beds = Object.entries(BEDS).map(([name, create]) => {
    const trim = ctx.createGain();
    const trimReverb = ctx.createGain();
    trim.connect(input);
    trimReverb.connect(reverb);
    Object.defineProperty(mix, name, {
      enumerable: true,
      get: () => trim.gain.value,
      set: (level) => {
        const value = Math.max(0, Number(level) || 0);
        trim.gain.value = value;
        trimReverb.gain.value = value;
      },
    });
    return create({ ...engine, input: trim, reverb: trimReverb });
  });
  globalThis.fugueMix = mix;

  return {
    update(scene, now) {
      for (const bed of beds) bed.update(scene, now);
    },
  };
}
