/**
 * Weather: rain as broadband hiss over a low patter; snow and fog as a barely
 * audible, muffled hush; ashfall as dry, sparse grains. The three layers
 * cross-fade as the weather turns.
 */

import { createCrackleBuffer, startLoop } from '../noise.js';
import { createEase, lerp } from '../util.js';

/** Seconds for one weather to give way to another. */
const WEATHER_TIME_CONSTANT = 2.5;

const RAIN_LEVEL = 0.14;
const RAIN_HIGHPASS_HZ = 700;
/** Heavier rain is brighter. */
const RAIN_LOWPASS_HZ = [3200, 8500];
/** Rain on the canopy: a low band beneath the hiss. */
const PATTER_LEVEL = 0.3;
const PATTER_HZ = 340;
const PATTER_Q = 0.8;

const HUSH_LEVEL = 0.06;
const HUSH_LOWPASS_HZ = 380;

const ASH_LEVEL = 0.2;
const ASH_HIGHPASS_HZ = 3200;
/** A thin continuous hiss under the grains, relative to them. */
const ASH_HISS_LEVEL = 0.15;
/** @type {import('../noise.js').CrackleSpec} */
const ASH_GRAINS = { seconds: 8.3, density: 16, loudness: 0.5, brightness: 0.9, skew: 3 };

/**
 * @param {import('../engine.js').Engine} engine
 * @returns {import('./fire.js').Bed}
 */
export function createWeather(engine) {
  const { ctx, noise } = engine;

  /** A silent gain feeding the mix, with its ease. */
  const layer = () => {
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(engine.input);
    return { gain, ease: createEase(gain.gain, WEATHER_TIME_CONSTANT) };
  };

  /**
   * @param {BiquadFilterType} type
   * @param {number} hz
   * @param {number} [q]
   */
  const filter = (type, hz, q) => {
    const node = ctx.createBiquadFilter();
    node.type = type;
    node.frequency.value = hz;
    if (q !== undefined) node.Q.value = q;
    return node;
  };

  const rain = layer();
  const rainHighpass = filter('highpass', RAIN_HIGHPASS_HZ);
  const rainLowpass = filter('lowpass', RAIN_LOWPASS_HZ[0]);
  rainHighpass.connect(rainLowpass).connect(rain.gain);
  startLoop(ctx, noise.white, rainHighpass);
  const patter = filter('bandpass', PATTER_HZ, PATTER_Q);
  const patterLevel = ctx.createGain();
  patterLevel.gain.value = PATTER_LEVEL;
  patter.connect(patterLevel).connect(rain.gain);
  startLoop(ctx, noise.pink, patter);
  const easeRainCutoff = createEase(rainLowpass.frequency, WEATHER_TIME_CONSTANT);

  const hush = layer();
  const hushLowpass = filter('lowpass', HUSH_LOWPASS_HZ);
  hushLowpass.connect(hush.gain);
  startLoop(ctx, noise.brown, hushLowpass);

  const ash = layer();
  const ashHighpass = filter('highpass', ASH_HIGHPASS_HZ);
  ashHighpass.connect(ash.gain);
  startLoop(ctx, createCrackleBuffer(ctx, ASH_GRAINS), ashHighpass);
  const ashHiss = ctx.createGain();
  ashHiss.gain.value = ASH_HISS_LEVEL;
  ashHiss.connect(ashHighpass);
  startLoop(ctx, noise.white, ashHiss);

  return {
    update(scene, now) {
      rain.ease(RAIN_LEVEL * scene.rain, now);
      easeRainCutoff(lerp(RAIN_LOWPASS_HZ[0], RAIN_LOWPASS_HZ[1], scene.rain), now);
      hush.ease(HUSH_LEVEL * scene.hush, now);
      ash.ease(ASH_LEVEL * scene.ash, now);
    },
  };
}
