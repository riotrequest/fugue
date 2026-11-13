/**
 * Materials and the palette that colours them.
 *
 * The scene is drawn as an indexed image: every pixel stores a material id and
 * a firelight level. The palette maps (material, level) to a colour, so time of
 * day, weather, firelight colour and one-shot flashes are all palette swaps and
 * cost a few hundred colour lerps per frame regardless of resolution.
 */

import { LEVEL_BITS, LIGHT_LEVELS, MAX_LEVEL } from './constants.js';
import { clamp01, smoothstep } from './util.js';

/** @typedef {[number, number, number]} RGB */

/**
 * @typedef {object} Material
 * @property {number} kind    one of the KIND_* constants
 * @property {RGB} night      ambient colour at midnight (or the emissive colour)
 * @property {RGB} day        ambient colour at noon
 * @property {RGB} [lit]      colour in full firelight (surface materials)
 * @property {RGB} [dawn]     explicit dawn key (keyed materials)
 * @property {RGB} [dusk]     explicit dusk key (keyed materials)
 * @property {number} [strength] star brightness 0..1 (star materials)
 */

/**
 * @typedef {object} Grade  everything that influences the palette this frame
 * @property {number} day       0 night .. 1 full daylight
 * @property {number} dawn      0..1 strength of the dawn tint
 * @property {number} dusk      0..1 strength of the dusk tint
 * @property {number} overcast  0..1 weather darkening
 * @property {RGB} fireTint     0..1 multipliers colouring the firelight
 * @property {number} stars     0..1 star visibility
 * @property {number} fade      0..1 end-of-game fade toward dark
 * @property {number} dark      0..1 'danger' flash
 * @property {number} pale      0..1 'memory' shimmer
 */

const KIND_SURFACE = 0; // lit by the fire through a ramp
const KIND_KEYED = 1; // sky-like: explicit colour per time of day, never fire-lit
const KIND_EMISSIVE = 2; // glows by itself
const KIND_STAR = 3; // blends from the sky colour to white at night

const LUMA = [0.3, 0.59, 0.11];
const DAWN_TINT = { mul: [1.02, 0.84, 0.94], add: [26, 12, 24] };
const DUSK_TINT = { mul: [1.22, 0.74, 0.7], add: [36, 8, 26] };
/** How far an automatic dawn/dusk tint pulls a colour toward its tinted luma. */
const TINT_STRENGTH = 0.62;
/** Firelight is washed out by daylight. */
const DAY_FIRE_VISIBILITY = 0.5;
const OVERCAST_DARKEN = 0.28;
/** Mid stop of the firelight ramp: a dark warm tone between ambient and lit. */
const RAMP_MID_LIT = 0.46;
const RAMP_MID_AMBIENT = 0.22;
const STAR_COLOUR = [226, 232, 255];
const PALE_COLOUR = [206, 212, 240];
const PALE_STRENGTH = 0.3;
const DARK_STRENGTH = 0.7;
const FADE_SURFACE = 0.9;
const FADE_EMISSIVE = 0.45;

const rgb = (hex) => /** @type {RGB} */ ([(hex >> 16) & 255, (hex >> 8) & 255, hex & 255]);
const luma = (c) => c[0] * LUMA[0] + c[1] * LUMA[1] + c[2] * LUMA[2];

/** Derives a moonlit colour from a neutral albedo: dark, pushed toward indigo. */
function nightOf(a) {
  const l = luma(a);
  return [a[0] * 0.26 + l * 0.04, a[1] * 0.26 + l * 0.06, a[2] * 0.36 + l * 0.24 + 12];
}

/** Derives the overcast, ashen daylight colour from a neutral albedo. */
function dayOf(a) {
  const l = luma(a);
  return [(a[0] * 0.6 + l * 0.4) * 0.82, (a[1] * 0.6 + l * 0.4) * 0.84, (a[2] * 0.6 + l * 0.4) * 0.8];
}

/** Derives the firelit colour from a neutral albedo: warm, gold, blue removed. */
function litOf(a) {
  return [Math.min(255, a[0] * 1.3 + 40), Math.min(255, a[1] * 1.12 + 14), a[2] * 0.78];
}

/** @type {Material[]} index = material id; id 0 is "transparent". */
const materials = [{ kind: KIND_KEYED, night: [0, 0, 0], day: [0, 0, 0] }];
const add = (material) => materials.push(material) - 1;

/** Surface whose three key colours are derived from one neutral albedo. */
const auto = (albedo) => {
  const a = rgb(albedo);
  return add({ kind: KIND_SURFACE, night: nightOf(a), day: dayOf(a), lit: litOf(a) });
};
/** Surface with hand-picked night / day / firelit colours. */
const tuned = (night, day, lit) =>
  add({ kind: KIND_SURFACE, night: rgb(night), day: rgb(day), lit: rgb(lit) });
/** Unlit material with an explicit colour for each time of day. */
const keyed = (night, dawn, day, dusk) =>
  add({ kind: KIND_KEYED, night: rgb(night), dawn: rgb(dawn), day: rgb(day), dusk: rgb(dusk) });
const emissive = (night, day = night) =>
  add({ kind: KIND_EMISSIVE, night: rgb(night), day: rgb(day) });
const star = (strength) => add({ kind: KIND_STAR, night: [0, 0, 0], day: [0, 0, 0], strength });

const shade = (albedo, k) => {
  const [r, g, b] = rgb(albedo);
  return (Math.round(r * k) << 16) | (Math.round(g * k) << 8) | Math.round(b * k);
};
const SHADE = 0.66;

const SKIN_ALBEDOS = [0xd8a888, 0xb88058, 0x8a5c40];
const HAIR_ALBEDOS = [0x2c2422, 0x6a4a2c, 0xa8a098, 0x8a3a20, 0xc8b070];
const COAT_ALBEDOS = [0x5a6448, 0x6e4e3a, 0x4a5c70, 0x803a34, 0x6c6c72, 0x8c7c4c, 0x52466a];
const BLANKET_ALBEDOS = [0x84483e, 0x4a6e5c, 0x8c8268, 0x50587e];
const LEG_ALBEDOS = [0x3c3c48, 0x4c4236];

/** Material ids. Object literal order defines the numbering. */
export const MAT = Object.freeze({
  NONE: 0,

  SKY_HI: keyed(0x060920, 0x62637f, 0x979c98, 0x3e2e5c),
  SKY_MID: keyed(0x0a0f32, 0x9c8590, 0xa3a7a1, 0x7a4460),
  SKY_LO: keyed(0x101846, 0xcfa296, 0xb0b3aa, 0xc47a40),
  STAR: star(1),
  STAR_DIM: star(0.5),
  FAR1: keyed(0x0c1440, 0x978590, 0x8a918a, 0x6c3e58),
  FAR2: keyed(0x080c2c, 0x675f70, 0x6a726b, 0x442848),
  DEPTH: keyed(0x04061a, 0x3a3846, 0x38403a, 0x22172e),
  BARK_FAR: keyed(0x070926, 0x4a4656, 0x474d47, 0x2c1e38),

  GRASS_D: tuned(0x0c1258, 0x4d584a, 0xb09030),
  GRASS: tuned(0x141c78, 0x5d6956, 0xd6bc4a),
  GRASS_L: tuned(0x2030a0, 0x717e66, 0xf0dc70),
  GRASS_T: tuned(0x3448b8, 0x88927a, 0xfff0a0),
  FLOOR: tuned(0x0a0e44, 0x414a40, 0x8a7028),
  FLOOR_D: tuned(0x06082a, 0x343c35, 0x5c4a20),
  DIRT: tuned(0x1c1a4c, 0x6a6050, 0xcc9c4c),
  DIRT_D: tuned(0x121034, 0x51493e, 0x986c30),
  SNOW: tuned(0x7c86c8, 0xd2d6d2, 0xffe8b0),
  SNOW_SH: tuned(0x4c56a0, 0xaeb6ba, 0xe8b878),
  FROST: tuned(0x3c50b0, 0x98a496, 0xf0e090),
  ASH: auto(0x8a8880),
  STONE: auto(0x8c8c92),
  STONE_D: auto(0x585862),

  BARK_D: tuned(0x0e0c30, 0x38332e, 0x9a5c14),
  BARK: tuned(0x1a1850, 0x4a433b, 0xd89a1c),
  BARK_L: tuned(0x2a2a70, 0x60584c, 0xf8c838),
  LEAF_D: tuned(0x04100c, 0x222c25, 0x2c3410),
  LEAF: tuned(0x0a2218, 0x2f3b2f, 0x5c6a1c),
  LEAF_EDGE: tuned(0x2c4a20, 0x45533b, 0x8c9026),
  LEAF_EDGE_L: tuned(0x506820, 0x5b6947, 0xc8b83c),

  WOOD_D: auto(0x4a3424),
  WOOD: auto(0x7a5636),
  WOOD_L: auto(0xa07848),
  WOOD_END: auto(0xc4a472),
  CHAR: auto(0x2a2224),
  THATCH: auto(0xa89858),
  THATCH_D: auto(0x7a6c3c),
  TARP: auto(0x5a7c82),
  TARP_D: auto(0x3c5a62),
  METAL: auto(0x9098a0),
  METAL_D: auto(0x5c646c),
  RUST: auto(0x8a4a2c),
  ROPE: auto(0xb0a078),
  CLOTH: auto(0xb8b0a0),
  MEAT: auto(0x9a3c34),
  SOIL: auto(0x5a4030),
  SOIL_D: auto(0x40302a),
  SPROUT: auto(0x5c9a48),
  INTERIOR: auto(0x18141c),
  WINDOW: emissive(0xe0a040, 0x2c3034),

  OUTLINE: auto(0x1c1820),
  BOOT: auto(0x241c1c),

  FLAME_W: emissive(0xfff6c8),
  FLAME_Y: emissive(0xffd040),
  FLAME_O: emissive(0xf88a18),
  FLAME_R: emissive(0xc03a14),
  EMBER: emissive(0xe05018),
  EMBER_D: emissive(0x7a1c10),
  SPARK: emissive(0xffc040),
  SPARK_D: emissive(0xd04818),

  SMOKE: tuned(0x2a2e5e, 0x7c807b, 0x9a7a58),
  SMOKE_L: tuned(0x3e4278, 0x969a94, 0xc8a070),
  FIREFLY: emissive(0xd8f070),
  ASHFLAKE: tuned(0x6c74a0, 0xb6b6ae, 0xe0c090),
  ASHFLAKE_D: tuned(0x444a76, 0x888882, 0xb09060),
  RAIN: tuned(0x4458a8, 0xa6aeb4, 0xc8b080),
  SPLASH: tuned(0x6474c0, 0xc2cace, 0xe8d0a0),
  SNOWFLAKE: tuned(0xaab2e8, 0xf0f0f0, 0xfff0d0),
  FOG: add({
    kind: KIND_SURFACE,
    night: rgb(0x262e66),
    day: rgb(0x9aa09a),
    lit: rgb(0x8a7850),
    dawn: rgb(0x85768a),
  }),
  DUST: auto(0xa09070),
  SHIMMER: emissive(0xdce0ff),
  EYE: emissive(0xd8e4c0),
  EYE_DIM: emissive(0x5c6680),
  BEACON: emissive(0xff4030),
  BEACON_DIM: emissive(0x701c18),
});

/** Per-figure colour families: [base ids], with matching shadow ids where used. */
export const SKINS = SKIN_ALBEDOS.map(auto);
export const HAIRS = HAIR_ALBEDOS.map(auto);
export const HAIRS_SH = HAIR_ALBEDOS.map((a) => auto(shade(a, SHADE)));
export const COATS = COAT_ALBEDOS.map(auto);
export const COATS_SH = COAT_ALBEDOS.map((a) => auto(shade(a, SHADE)));
export const BLANKETS = BLANKET_ALBEDOS.map(auto);
export const BLANKETS_SH = BLANKET_ALBEDOS.map((a) => auto(shade(a, SHADE)));
export const LEGS = LEG_ALBEDOS.map(auto);

const MATERIAL_COUNT = materials.length;
export const PALETTE_SIZE = MATERIAL_COUNT << LEVEL_BITS;

const flags = (ids) => {
  const table = new Uint8Array(256);
  for (const id of ids) table[id] = 1;
  return table;
};

/** Lookup: is this material open ground (grass, dirt, snow)? */
export const IS_GROUND = flags([
  MAT.GRASS_D, MAT.GRASS, MAT.GRASS_L, MAT.FLOOR, MAT.FLOOR_D,
  MAT.DIRT, MAT.DIRT_D, MAT.SNOW, MAT.SNOW_SH, MAT.FROST,
]);
/** Lookup: is this material open sky? */
export const IS_SKY = flags([MAT.SKY_HI, MAT.SKY_MID, MAT.SKY_LO]);
/** Lookup: flame pixels, which fog must not veil. */
export const IS_FLAME = flags([MAT.FLAME_W, MAT.FLAME_Y, MAT.FLAME_O, MAT.FLAME_R]);

/**
 * Splits the 0..1 clock into the blend weights used for grading.
 * @param {number} time 0 = midnight, 0.25 dawn, 0.5 noon, 0.75 dusk
 */
export function dayPhase(time) {
  const day = smoothstep(0.2, 0.33, time) * (1 - smoothstep(0.67, 0.8, time));
  const bump = (centre) => {
    const d = clamp01(1 - Math.abs(time - centre) / 0.1);
    return d * d * (3 - 2 * d);
  };
  return { day, dawn: bump(0.25), dusk: bump(0.75) };
}

const scratch = [0, 0, 0];

/** Ambient (no firelight) colour of a material under the given grade. */
function ambient(material, grade, out) {
  const { night, day } = material;
  const keyedTint = material.kind === KIND_KEYED;
  for (let c = 0; c < 3; c++) out[c] = night[c] + (day[c] - night[c]) * grade.day;
  if (grade.dawn > 0) blendTint(out, material.dawn, DAWN_TINT, grade.dawn, keyedTint);
  if (grade.dusk > 0) blendTint(out, material.dusk, DUSK_TINT, grade.dusk, keyedTint);
  const dim = 1 - grade.overcast * OVERCAST_DARKEN;
  out[0] *= dim;
  out[1] *= dim;
  out[2] *= dim;
}

function blendTint(colour, key, tint, amount, full) {
  if (key) {
    const k = full ? amount : amount * TINT_STRENGTH;
    for (let c = 0; c < 3; c++) colour[c] += (key[c] - colour[c]) * k;
    return;
  }
  const l = luma(colour);
  const k = amount * TINT_STRENGTH;
  for (let c = 0; c < 3; c++) colour[c] += (l * tint.mul[c] + tint.add[c] - colour[c]) * k;
}

/** Applies whole-screen effects and packs a colour for a little-endian RGBA buffer. */
function pack(r, g, b, grade, fadeStrength) {
  const dim = (1 - grade.fade * fadeStrength) * (1 - grade.dark * DARK_STRENGTH);
  const pale = grade.pale * PALE_STRENGTH;
  r = r * dim;
  g = g * dim;
  b = b * dim;
  r += (PALE_COLOUR[0] - r) * pale;
  g += (PALE_COLOUR[1] - g) * pale;
  b += (PALE_COLOUR[2] - b) * pale;
  const ri = r < 0 ? 0 : r > 255 ? 255 : r | 0;
  const gi = g < 0 ? 0 : g > 255 ? 255 : g | 0;
  const bi = b < 0 ? 0 : b > 255 ? 255 : b | 0;
  return (0xff000000 | (bi << 16) | (gi << 8) | ri) >>> 0;
}

/**
 * Rebuilds the whole palette for the current grade.
 * @param {Uint32Array} out  PALETTE_SIZE entries, indexed (material << LEVEL_BITS) | level
 * @param {Grade} grade
 */
export function buildPalette(out, grade) {
  const fireVisibility = 1 - grade.day * (1 - DAY_FIRE_VISIBILITY);
  const sky = [0, 0, 0];
  ambient(materials[MAT.SKY_HI], grade, sky);

  for (let id = 1; id < MATERIAL_COUNT; id++) {
    const material = materials[id];
    const base = id << LEVEL_BITS;

    if (material.kind !== KIND_SURFACE) {
      let colour;
      let fadeStrength = FADE_SURFACE;
      if (material.kind === KIND_EMISSIVE) {
        for (let c = 0; c < 3; c++) {
          scratch[c] = material.night[c] + (material.day[c] - material.night[c]) * grade.day;
        }
        fadeStrength = FADE_EMISSIVE;
      } else if (material.kind === KIND_STAR) {
        const k = grade.stars * material.strength;
        for (let c = 0; c < 3; c++) scratch[c] = sky[c] + (STAR_COLOUR[c] - sky[c]) * k;
      } else {
        ambient(material, grade, scratch);
      }
      colour = pack(scratch[0], scratch[1], scratch[2], grade, fadeStrength);
      out.fill(colour, base, base + LIGHT_LEVELS);
      continue;
    }

    ambient(material, grade, scratch);
    const [ar, ag, ab] = scratch;
    const lr = material.lit[0] * grade.fireTint[0];
    const lg = material.lit[1] * grade.fireTint[1];
    const lb = material.lit[2] * grade.fireTint[2];
    const mr = lr * RAMP_MID_LIT + ar * RAMP_MID_AMBIENT;
    const mg = lg * RAMP_MID_LIT + ag * RAMP_MID_AMBIENT;
    const mb = lb * RAMP_MID_LIT + ab * RAMP_MID_AMBIENT;

    for (let level = 0; level < LIGHT_LEVELS; level++) {
      const w = (level / MAX_LEVEL) * fireVisibility;
      let r;
      let g;
      let b;
      if (w < 0.5) {
        const k = w * 2;
        r = ar + (mr - ar) * k;
        g = ag + (mg - ag) * k;
        b = ab + (mb - ab) * k;
      } else {
        const k = w * 2 - 1;
        r = mr + (lr - mr) * k;
        g = mg + (lg - mg) * k;
        b = mb + (lb - mb) * k;
      }
      // At night the ramp may darken a channel (blue grass turning olive);
      // in daylight firelight only ever adds a faint warm wash.
      if (grade.day > 0) {
        r += (Math.max(ar, ar + (lr - ar) * w) - r) * grade.day;
        g += (Math.max(ag, ag + (lg - ag) * w) - g) * grade.day;
        b += (Math.max(ab, ab + (lb - ab) * w) - b) * grade.day;
      }
      out[base + level] = pack(r, g, b, grade, FADE_SURFACE);
    }
  }
}
