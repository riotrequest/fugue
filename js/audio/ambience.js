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

  const bus = { ...engine, input, reverb };
  const beds = [createFire, createWind, createWeather, createThreat, createBeacon, createNightlife].map((create) =>
    create(bus),
  );

  return {
    update(scene, now) {
      for (const bed of beds) bed.update(scene, now);
    },
  };
}
