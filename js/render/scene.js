/**
 * Fugue's scene renderer: a living 16-bit campfire clearing.
 *
 * The scene is an indexed software framebuffer. Static layers are painted once
 * into material/reach surfaces; each frame they are copied, animated sprites
 * and particles are drawn on top, and a single pass resolves every pixel
 * through two tiny tables: the light LUT (fire radius and flicker) and the
 * palette (time of day, weather, firelight colour, flashes).
 */

import { W, H, FIRE_X, FIRE_Y, LEVEL_BITS, CLEARING, HORIZON_Y } from './constants.js';
import { MAT, PALETTE_SIZE, buildPalette, dayPhase } from './palette.js';
import { Surface, blit, resolveSnow, OPAQUE } from './surface.js';
import { DITHER_BITS, LIGHT_LUT_SIZE, fillLightLut } from './light.js';
import { paintSky, createStars, drawStars } from './layers/sky.js';
import { paintGround, createTufts, drawTufts } from './layers/ground.js';
import { paintFarTrunks, paintTrunks, createCanopy, drawCanopy, snowCanopy } from './layers/trees.js';
import {
  STRUCTURE_IDS, BEACON_POS, SMOKEHOUSE_VENT, WOODPILE_MAX,
  createStructures, buildWoodpile, structureCentre,
} from './structures.js';
import { createFigures } from './figures.js';
import { FIRE_DEAD, drawFire, fireLight } from './fire.js';
import { KIND, createParticles } from './particles.js';
import { createWeather } from './weather.js';
import { createWatchers, drawWatchers } from './threat.js';
import { BAYER4, clamp, clamp01, finite, unit, valueNoise } from './util.js';

/**
 * @typedef {object} Person
 * @property {string|number} id
 * @property {number} seed  drives colours and build
 * @property {'sitting'|'sleeping'|'standing'|'working'|'away'} pose
 */

/**
 * @typedef {object} SceneView  what the simulation wants shown; every field is optional
 * @property {number} [time]             0..1, 0 = midnight, 0.5 = noon
 * @property {number} [day]
 * @property {number} [fire]             0..1 intensity
 * @property {'clear'|'rain'|'snow'|'fog'|'ash'} [weather]
 * @property {number} [weatherIntensity] 0..1
 * @property {number} [wind]             0..1
 * @property {number} [cold]             0..1 depth of winter
 * @property {number} [wood]             0..1 woodpile fullness
 * @property {'asleep'|'sitting'|'tending'|'away'} [player]
 * @property {Person[]} [people]
 * @property {string[]} [structures]
 * @property {number} [threat]           0..1
 * @property {boolean} [beacon]
 * @property {string|null} [ended]
 */

/**
 * @typedef {object} Scene
 * @property {(view: SceneView, dt: number) => void} update
 * @property {() => void} render
 * @property {(kind: 'stoke'|'arrive'|'danger'|'memory'|'build') => void} pulse
 */

const MAX_DT = 0.1;
/** Exponential ease rates, per second. */
const RATE = { time: 4, fire: 2.2, wind: 1.5, cold: 1, wood: 3, weather: 0.8, threat: 1.5, beacon: 3, fade: 0.22 };
const DECAY = { flare: 2.6, dark: 3, pale: 0.9, startle: 0.7 };
const WEATHER_KINDS = ['rain', 'snow', 'ash', 'fog'];

const RISE_SECONDS = 1.8;
/** Falling snow slowly whitens the ground even before winter sets in. */
const SETTLE_RATE = 0.03;
const MELT_RATE = 0.012;
const SETTLE_COVER = 0.55;
/** Snow cover is re-resolved only when the cold crosses one of these steps. */
const COLD_STEP = 4;

const FLARE_BOOST = 0.28;
const FLICKER_RADIUS = 0.07;
const FLICKER_WIND = 0.07;
const FLICKER_PEAK = 0.12;

const SPARKS_PER_SECOND = 15;
const SPARK_MIN_FIRE = 0.2;
const STOKE_SPARKS = 22;
const SMOKE_PER_SECOND = 2.4;
const SMOKE_FIRE_BONUS = 4;
const VENT_SMOKE_PER_SECOND = 1.3;
const MOTE_TARGET = 9;
const FIREFLY_TARGET = 9;
const FIREFLY_MAX_DAY = 0.25;
const FIREFLY_MAX_COLD = 0.3;
const SHIMMER_COUNT = 30;
const DUST_COUNT = 16;
const MIST_STRENGTH = 1;
const BEACON_RATE = 1.7;

const OVERCAST = { rain: 0.9, snow: 0.55, ash: 0.7, fog: 0.5 };

/**
 * Creates the scene renderer on a canvas. The canvas is resized to the
 * logical resolution; scale it up with CSS and `image-rendering: pixelated`.
 * @param {HTMLCanvasElement} canvas
 * @returns {Scene}
 */
export function createScene(canvas) {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(W, H);
  const pixels = new Uint32Array(image.data.buffer);

  // --- The static world, painted once -------------------------------------
  const forest = new Surface(W, H);
  paintSky(forest);
  paintGround(forest);
  paintFarTrunks(forest);
  const trunks = new Surface(W, H);
  paintTrunks(trunks);
  forest.stamp(trunks, 0, 0);

  const structures = createStructures(trunks);
  const watchers = createWatchers(forest);
  const tufts = createTufts();
  const stars = createStars();
  const canopy = createCanopy();
  const figures = createFigures();
  const particles = createParticles();
  const weather = createWeather();

  /** Forest plus everything built, before snow. */
  const composite = new Surface(W, H);
  /** Materials of `composite` with the current snow cover applied. */
  const settled = new Uint8Array(W * H);
  const frame = new Surface(W, H);
  const palette = new Uint32Array(PALETTE_SIZE);
  const lut = new Uint8Array(LIGHT_LUT_SIZE);

  // --- Eased state ---------------------------------------------------------
  const state = {
    started: false,
    t: 0,
    time: 0,
    fire: 0,
    wind: 0,
    cold: 0,
    wood: 0,
    threat: 0,
    beacon: 0,
    fade: 0,
    settle: 0,
    weather: { rain: 0, snow: 0, ash: 0, fog: 0 },
    /** @type {Set<string>} */
    built: new Set(),
    /** @type {{ id: string, progress: number }[]} structures dithering into existence */
    rising: [],
    lastBuilt: /** @type {string|null} */ (null),
    logs: 0,
    coldByte: 0,
    layoutDirty: true,
    snowDirty: true,
    flare: 0,
    dark: 0,
    pale: 0,
    startle: 0,
    owed: { spark: 0, smoke: 0, vent: 0 },
  };

  const rand = (lo, hi) => lo + Math.random() * (hi - lo);

  function syncStructures(list, snap, dt) {
    const wanted = new Set(Array.isArray(list) ? list.filter((id) => STRUCTURE_IDS.includes(id)) : []);
    for (const id of wanted) {
      if (state.built.has(id) || state.rising.some((r) => r.id === id)) continue;
      state.lastBuilt = id;
      if (snap) {
        state.built.add(id);
        state.layoutDirty = true;
      } else {
        state.rising.push({ id, progress: 0 });
      }
    }
    for (const id of state.built) {
      if (wanted.has(id)) continue;
      state.built.delete(id);
      state.layoutDirty = true;
    }
    state.rising = state.rising.filter((r) => {
      if (!wanted.has(r.id)) return false;
      r.progress += dt / RISE_SECONDS;
      if (r.progress < 1) return true;
      state.built.add(r.id);
      state.layoutDirty = true;
      return false;
    });
  }

  function emit(dt, phase) {
    const { fire, owed } = state;
    if (fire > SPARK_MIN_FIRE) owed.spark += fire * fire * SPARKS_PER_SECOND * dt;
    for (; owed.spark >= 1; owed.spark--) spawnSpark(1);
    if (fire > FIRE_DEAD) owed.smoke += (SMOKE_PER_SECOND + fire * SMOKE_FIRE_BONUS) * dt;
    for (; owed.smoke >= 1; owed.smoke--) {
      particles.spawn(KIND.SMOKE, FIRE_X + rand(-2, 2), FIRE_Y - 5 - fire * 14, rand(-1, 1), -rand(9, 15), rand(3.5, 6.5));
    }
    if (state.built.has('smokehouse')) owed.vent += VENT_SMOKE_PER_SECOND * dt;
    for (; owed.vent >= 1; owed.vent--) {
      particles.spawn(KIND.SMOKE, SMOKEHOUSE_VENT.x, SMOKEHOUSE_VENT.y, 0, -rand(6, 9), rand(1.6, 2.6));
    }

    if (particles.count(KIND.MOTE) < MOTE_TARGET && Math.random() < dt * 2) {
      particles.spawn(KIND.MOTE, rand(0, W), rand(HORIZON_Y - 20, H - 30), 0, rand(2.5, 6), rand(9, 16));
    }
    const calm = state.weather.rain + state.weather.snow + state.weather.ash < 0.1;
    const fireflies = phase.day < FIREFLY_MAX_DAY && state.cold < FIREFLY_MAX_COLD && calm;
    if (fireflies && particles.count(KIND.FIREFLY) < FIREFLY_TARGET && Math.random() < dt * 1.5) {
      const angle = rand(0, Math.PI * 2);
      const radial = rand(0.55, 1);
      particles.spawn(
        KIND.FIREFLY,
        CLEARING.cx + Math.cos(angle) * CLEARING.rx * radial,
        CLEARING.cy + Math.sin(angle) * CLEARING.ry * radial * 0.8 - 6,
        0, 0, rand(7, 15),
      );
    }
  }

  function spawnSpark(vigour) {
    particles.spawn(
      KIND.SPARK,
      FIRE_X + rand(-3, 3),
      FIRE_Y - rand(3, 6 + state.fire * 12),
      rand(-9, 9) * vigour,
      -rand(20, 48) * (0.55 + state.fire * 0.6) * vigour,
      rand(0.5, 1.6),
    );
  }

  /**
   * @param {SceneView} view
   * @param {number} dt seconds since the last update
   */
  function update(view, dt) {
    const v = view && typeof view === 'object' ? view : {};
    const step = clamp(finite(dt, 0), 0, MAX_DT);
    const snap = !state.started;
    const toward = (current, target, rate) =>
      snap ? target : current + (target - current) * (1 - Math.exp(-rate * step));

    state.t += step;

    // The clock wraps, so ease along the shorter way round.
    const time = ((finite(v.time, 0) % 1) + 1) % 1;
    const turn = ((time - state.time + 1.5) % 1) - 0.5;
    state.time = (toward(state.time, state.time + turn, RATE.time) + 1) % 1;

    state.fire = toward(state.fire, unit(v.fire), RATE.fire);
    state.wind = toward(state.wind, unit(v.wind), RATE.wind);
    state.cold = toward(state.cold, unit(v.cold), RATE.cold);
    state.wood = toward(state.wood, unit(v.wood), RATE.wood);
    state.threat = toward(state.threat, unit(v.threat), RATE.threat);
    state.beacon = toward(state.beacon, v.beacon ? 1 : 0, RATE.beacon);
    state.fade = toward(state.fade, v.ended == null ? 0 : 1, RATE.fade);

    const intensity = unit(v.weatherIntensity);
    for (const kind of WEATHER_KINDS) {
      state.weather[kind] = toward(state.weather[kind], v.weather === kind ? intensity : 0, RATE.weather);
    }
    const snowing = state.weather.snow;
    state.settle = clamp01(state.settle + (snowing > 0.05 ? snowing * SETTLE_RATE : -MELT_RATE) * step);

    syncStructures(v.structures, snap, step);
    const logs = Math.round(state.wood * WOODPILE_MAX);
    if (logs !== state.logs) {
      state.logs = logs;
      state.layoutDirty = true;
    }
    const cover = clamp01(state.cold + state.settle * SETTLE_COVER);
    const coldByte = Math.round((cover * 255) / COLD_STEP) * COLD_STEP;
    if (coldByte !== state.coldByte) {
      state.coldByte = coldByte;
      state.snowDirty = true;
    }

    figures.sync(v.people, v.player, snap);
    figures.update(step);

    state.flare *= Math.exp(-DECAY.flare * step);
    state.dark *= Math.exp(-DECAY.dark * step);
    state.pale *= Math.exp(-DECAY.pale * step);
    state.startle = Math.max(0, state.startle - DECAY.startle * step);

    emit(step, dayPhase(state.time));
    particles.update(step, state.wind, state.t);
    weather.update(step, state.weather, state.wind, state.t, particles);
    state.started = true;
  }

  /** Re-stamps everything built onto the forest. Runs only when the camp changes. */
  function rebuildLayout() {
    composite.copyFrom(forest);
    const parts = [...state.built].flatMap((id) => structures.get(id) ?? []);
    if (state.logs > 0) parts.push(buildWoodpile(state.logs));
    parts.sort((a, b) => a.depth - b.depth);
    for (const part of parts) composite.stamp(part.sprite, part.x, part.y, part.reach);
    state.layoutDirty = false;
    state.snowDirty = true;
  }

  function drawBeacon() {
    if (!state.built.has('radio') || state.beacon < 0.05) return;
    const { x, y } = BEACON_POS;
    const glow = (0.5 + 0.5 * Math.sin(state.t * BEACON_RATE)) * state.beacon;
    frame.paint(x, y, glow > 0.3 ? MAT.BEACON : MAT.BEACON_DIM);
    if (glow > 0.7) {
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) frame.paint(x + dx, y + dy, MAT.BEACON_DIM);
    }
  }

  function render() {
    if (state.layoutDirty) rebuildLayout();
    if (state.snowDirty) {
      resolveSnow(composite, settled, state.coldByte);
      snowCanopy(canopy, state.coldByte);
      state.snowDirty = false;
    }

    const { t, wind } = state;
    const fire = clamp01(state.fire + state.flare * FLARE_BOOST);
    const light = fireLight(fire);
    const flicker = valueNoise(t * 9, 0, 1) * 0.6 + valueNoise(t * 23, 5, 2) * 0.4 - 0.5;
    fillLightLut(
      lut,
      light.radius * (1 + flicker * (FLICKER_RADIUS + wind * FLICKER_WIND)),
      Math.min(1, light.peak * (1 + flicker * FLICKER_PEAK)),
    );

    const phase = dayPhase(state.time);
    const overcast = Math.max(...WEATHER_KINDS.map((kind) => state.weather[kind] * OVERCAST[kind]));

    frame.mat.set(settled);
    frame.reach.set(composite.reach);
    drawStars(frame, stars, clamp01(1 - phase.day * 2.5) * (1 - overcast), t);
    drawWatchers(frame, watchers, lut, state.threat, state.startle, t);
    drawTufts(frame, tufts, t, wind, state.coldByte);
    for (const { id, progress } of state.rising) {
      for (const part of structures.get(id) ?? []) {
        blit(frame, part.sprite, part.x, part.y, part.reach, false, Math.round(progress * OPAQUE));
      }
    }
    figures.draw(frame, true, t);
    drawFire(frame, fire, t, wind);
    drawBeacon();
    figures.draw(frame, false, t);
    particles.draw(frame, t);
    drawCanopy(frame, canopy, t, wind);
    weather.draw(frame, state.weather, phase.dawn * MIST_STRENGTH * (1 - state.weather.rain), wind, t);

    buildPalette(palette, {
      day: phase.day,
      dawn: phase.dawn,
      dusk: phase.dusk,
      overcast,
      fireTint: light.tint,
      stars: clamp01(1 - phase.day * 2.5) * (1 - overcast),
      fade: state.fade,
      dark: state.dark,
      pale: state.pale,
    });

    const { mat, reach } = frame;
    for (let y = 0, i = 0; y < H; y++) {
      const bayerRow = (y & 3) << 2;
      for (let x = 0; x < W; x++, i++) {
        const level = lut[(reach[i] << DITHER_BITS) | BAYER4[bayerRow | (x & 3)]];
        pixels[i] = palette[(mat[i] << LEVEL_BITS) | level];
      }
    }
    ctx.putImageData(image, 0, 0);
  }

  /** @param {'stoke'|'arrive'|'danger'|'memory'|'build'} kind */
  function pulse(kind) {
    switch (kind) {
      case 'stoke':
        state.flare = 1;
        for (let i = 0; i < STOKE_SPARKS; i++) spawnSpark(1.5);
        break;
      case 'arrive':
        state.flare = Math.max(state.flare, 0.3);
        for (let i = 0; i < 6; i++) spawnSpark(0.8);
        break;
      case 'danger':
        state.dark = 1;
        state.startle = 1;
        break;
      case 'memory':
        state.pale = 1;
        for (let i = 0; i < SHIMMER_COUNT; i++) {
          particles.spawn(
            KIND.SHIMMER,
            CLEARING.cx + rand(-1, 1) * CLEARING.rx * 0.8,
            CLEARING.cy + rand(-1, 1) * CLEARING.ry * 0.7,
            rand(-2, 2), -rand(3, 9), rand(1.2, 2.6),
          );
        }
        break;
      case 'build': {
        const { x, y } = structureCentre(state.lastBuilt);
        state.flare = Math.max(state.flare, 0.2);
        for (let i = 0; i < DUST_COUNT; i++) {
          particles.spawn(KIND.DUST, x + rand(-14, 14), y - rand(0, 6), rand(-10, 10), -rand(4, 14), rand(0.5, 1.1));
        }
        break;
      }
      default:
    }
  }

  return { update, render, pulse };
}
