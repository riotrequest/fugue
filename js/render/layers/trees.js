/**
 * The forest ringing the clearing: thin far trunks lost in the dark, the huge
 * near trunks whose bark and roots catch the firelight, and the canopy masses
 * that frame the corners and sway in the wind.
 */

import { W, FIRE_X, FIRE_Y, HORIZON_Y, REACH_NEVER, WORLD_SEED } from '../constants.js';
import { MAT } from '../palette.js';
import { Surface, blit, resolveSnow } from '../surface.js';
import { groundReach } from '../light.js';
import { clamp, hash2, mulberry32 } from '../util.js';

/**
 * @typedef {object} TrunkSpec
 * @property {number} x     centre of the trunk at its base
 * @property {number} base  row where the trunk meets the ground
 * @property {number} w     width above the root flare
 * @property {number} lean  horizontal drift per 100 rows of height
 */

/** @type {TrunkSpec[]} back to front */
const TRUNKS = [
  { x: 181, base: 45, w: 13, lean: 1 },
  { x: 132, base: 47, w: 15, lean: -1 },
  { x: 226, base: 53, w: 18, lean: -2 },
  { x: 70, base: 55, w: 16, lean: 2 },
  { x: 270, base: 63, w: 15, lean: 2 },
  { x: 18, base: 76, w: 22, lean: -3 },
  { x: 306, base: 86, w: 22, lean: 3 },
  { x: -3, base: 152, w: 28, lean: -2 },
  { x: 323, base: 158, w: 28, lean: 2 },
];

const FAR_TRUNK_COUNT = 16;
/** Trunks stand tall above the ground, so light reaches them more easily. */
const TRUNK_REACH_SCALE = 0.32;
const FLARE_HEIGHT = 20;
const FLARE_SPREAD = 0.42;
/** Reach added per pixel in from the fire-facing edge: the width of the rim. */
const RIM_FALLOFF = 7;
const RIDGE_FALLOFF = 4;
const FAR_EDGE_REACH = 58;
const HEIGHT_FALLOFF = 0.3;
const ROOT_SNOW = 120;

/**
 * @typedef {object} ClumpSpec
 * @property {number} cx
 * @property {number} cy
 * @property {number} rx
 * @property {number} ry
 */

/** @type {ClumpSpec[]} canopy masses framing the top corners and bottom edge */
const CLUMPS = [
  { cx: 98, cy: 1, rx: 24, ry: 8 },
  { cx: 60, cy: 6, rx: 30, ry: 13 },
  { cx: 18, cy: 10, rx: 32, ry: 18 },
  { cx: 6, cy: 36, rx: 18, ry: 15 },
  { cx: 222, cy: 0, rx: 22, ry: 7 },
  { cx: 260, cy: 5, rx: 30, ry: 12 },
  { cx: 302, cy: 10, rx: 32, ry: 18 },
  { cx: 314, cy: 38, rx: 17, ry: 15 },
  { cx: 12, cy: 173, rx: 30, ry: 13 },
  { cx: 54, cy: 180, rx: 24, ry: 8 },
  { cx: 196, cy: 183, rx: 26, ry: 7 },
  { cx: 262, cy: 181, rx: 26, ry: 8 },
  { cx: 306, cy: 172, rx: 30, ry: 14 },
];

const LEAF_RADIUS_MIN = 5;
const LEAF_RADIUS_RANGE = 5;
const CLUMP_AREA_PER_DISC = 26;
/** The canopy hangs high above the ground and sees the fire unobstructed. */
const CANOPY_REACH_SCALE = 0.42;
const CANOPY_SWAY_RATE = 0.7;

/** Paints the unlit far trunks into the backdrop. */
export function paintFarTrunks(surface) {
  const rng = mulberry32(WORLD_SEED + 3);
  for (let i = 0; i < FAR_TRUNK_COUNT; i++) {
    const x = Math.floor(((i + rng()) / FAR_TRUNK_COUNT) * W);
    const width = 3 + Math.floor(rng() * 5);
    const base = HORIZON_Y - 2 + Math.floor(rng() * 8);
    for (let y = 0; y <= base; y++) {
      const flare = y > base - 4 ? 1 : 0;
      for (let dx = -flare; dx < width + flare; dx++) surface.set(x + dx, y, MAT.BARK_FAR, REACH_NEVER);
    }
  }
}

/**
 * Paints the big trunks into a surface.
 * @param {Surface} surface
 */
export function paintTrunks(surface) {
  TRUNKS.forEach((trunk, index) => paintTrunk(surface, trunk, index + 1));
}

function paintTrunk(surface, trunk, seed) {
  const litSide = FIRE_X >= trunk.x ? 1 : -1;
  const baseReach = groundReach(trunk.x, trunk.base) * TRUNK_REACH_SCALE;
  const flareStart = trunk.base - FLARE_HEIGHT;
  let baseHalfWidth = trunk.w / 2;

  for (let y = 0; y <= trunk.base; y++) {
    const k = y > flareStart ? (y - flareStart) / FLARE_HEIGHT : 0;
    const halfWidth = trunk.w / 2 + k * k * trunk.w * FLARE_SPREAD + (hash2(y >> 2, seed, 3) - 0.5) * 1.3;
    const centre = Math.round(trunk.x + (trunk.lean * (trunk.base - y)) / 100);
    const x0 = Math.round(centre - halfWidth);
    const x1 = Math.round(centre + halfWidth);
    const lift = (trunk.base - y) * HEIGHT_FALLOFF;
    baseHalfWidth = halfWidth;

    for (let x = x0; x <= x1; x++) {
      // Bark runs in vertical streaks that occasionally jog sideways.
      const column = x - centre + (hash2(y >> 4, x - centre, seed) < 0.22 ? 1 : 0);
      const streak = hash2(column, seed, 11);
      const fromLit = litSide > 0 ? x1 - x : x - x0;
      const fromDark = litSide > 0 ? x - x0 : x1 - x;
      const ridge = streak > 0.7;
      let mat = streak < 0.5 ? MAT.BARK_D : streak < 0.85 ? MAT.BARK : MAT.BARK_L;
      let reach = fromLit * (ridge ? RIDGE_FALLOFF : RIM_FALLOFF) + lift;
      if (fromDark < 2) {
        mat = fromDark < 1 ? MAT.BARK_D : MAT.BARK;
        reach = Math.min(reach, FAR_EDGE_REACH + lift);
      }
      surface.set(x, y, mat, baseReach + reach);
    }
  }

  const rng = mulberry32(WORLD_SEED + seed * 131);
  for (const side of [-1, 1]) {
    const count = 2 + Math.floor(rng() * 2);
    for (let r = 0; r < count; r++) {
      paintRoot(surface, {
        x: Math.round(trunk.x + side * baseHalfWidth * (0.55 + r * 0.2)),
        y: trunk.base - 5 + r * 2,
        side,
        length: 7 + Math.floor(rng() * 10) + r * 2,
        drop: 3 + Math.floor(rng() * 5),
        reach: baseReach + (side === litSide ? 0 : 26),
      });
    }
  }
}

/** A root is a tapering finger that sweeps outward and settles on the ground. */
function paintRoot(surface, root) {
  for (let i = 0; i <= root.length; i++) {
    const k = i / root.length;
    const x = root.x + root.side * i;
    const y = root.y + Math.round(root.drop * Math.sin(k * Math.PI * 0.5));
    const thickness = 1 + Math.round(3 * (1 - k));
    const travel = root.reach + i * 1.2;
    surface.set(x, y, MAT.BARK_L, travel, ROOT_SNOW + ((i * 37) % 60));
    for (let d = 1; d < thickness; d++) {
      surface.set(x, y + d, d === thickness - 1 ? MAT.BARK_D : MAT.BARK, travel + d * 16);
    }
  }
}

/**
 * @typedef {object} Clump
 * @property {Surface} sprite  pristine canopy sprite
 * @property {Surface} drawn   sprite with the current snow cover applied
 * @property {number} x        left edge on screen
 * @property {number} y        top edge on screen
 * @property {number} reach    absolute firelight reach of the clump
 * @property {number} phase    sway phase offset
 */

/** @returns {Clump[]} */
export function createCanopy() {
  return CLUMPS.map((spec, index) => {
    const rng = mulberry32(WORLD_SEED + 500 + index * 7);
    const margin = LEAF_RADIUS_MIN + LEAF_RADIUS_RANGE + 2;
    const w = spec.rx * 2 + margin * 2;
    const h = spec.ry * 2 + margin * 2;
    const sprite = new Surface(w, h);
    const toFire = Math.hypot(FIRE_X - spec.cx, FIRE_Y - spec.cy);
    const dirX = (FIRE_X - spec.cx) / toFire;
    const dirY = (FIRE_Y - spec.cy) / toFire;

    const discs = [];
    const count = Math.ceil((Math.PI * spec.rx * spec.ry) / CLUMP_AREA_PER_DISC);
    for (let i = 0; i < count; i++) {
      const angle = rng() * Math.PI * 2;
      const radial = Math.sqrt(rng());
      discs.push({
        x: w / 2 + Math.cos(angle) * radial * spec.rx,
        y: h / 2 + Math.sin(angle) * radial * spec.ry,
        r: LEAF_RADIUS_MIN + rng() * LEAF_RADIUS_RANGE,
      });
    }
    // Paint the discs nearest the fire last so their lit rims stay on top.
    discs.sort((a, b) => a.x * dirX + a.y * dirY - (b.x * dirX + b.y * dirY));
    for (const disc of discs) paintLeafDisc(sprite, disc, dirX, dirY, index);

    const drawn = new Surface(w, h);
    drawn.copyFrom(sprite);
    return {
      sprite,
      drawn,
      x: Math.round(spec.cx - w / 2),
      y: Math.round(spec.cy - h / 2),
      reach: Math.round(groundReach(spec.cx, spec.cy) * CANOPY_REACH_SCALE),
      phase: rng() * Math.PI * 2,
    };
  });
}

function paintLeafDisc(sprite, disc, dirX, dirY, seed) {
  const r = Math.ceil(disc.r) + 1;
  const cx = Math.round(disc.x);
  const cy = Math.round(disc.y);
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const x = cx + dx;
      const y = cy + dy;
      const d = Math.hypot(dx, dy * 1.15);
      const edge = disc.r + (hash2(x, y, seed) - 0.5) * 1.8;
      if (d > edge) continue;
      const inset = edge - d;
      const facing = d > 0 ? (dx * dirX + dy * dirY) / d : 0;
      const grain = hash2(x, y, seed + 100);

      let mat = MAT.LEAF_D;
      let reach = REACH_NEVER;
      if (inset < 2.4 && facing > 0.1) {
        if (grain < 0.42) [mat, reach] = [MAT.LEAF_EDGE_L, 0];
        else if (grain < 0.84) [mat, reach] = [MAT.LEAF_EDGE, 12];
        else [mat, reach] = [MAT.LEAF, 40];
      } else if (inset < 5 && facing > 0.25 && grain < 0.3) [mat, reach] = [MAT.LEAF, 60];
      else if (grain < 0.07) [mat, reach] = [MAT.LEAF, 90];

      const skyward = d > 0 ? -dy / d : 0;
      const snow = inset < 3.2 && skyward > 0.35 ? 110 + Math.floor(grain * 110) : 0;
      sprite.set(x, y, mat, reach, snow);
    }
  }
}

/** Re-applies snow cover to every clump. Call when the cold changes. */
export function snowCanopy(canopy, cold) {
  for (const clump of canopy) resolveSnow(clump.sprite, clump.drawn.mat, cold);
}

/**
 * Draws the canopy over the frame, each clump shifting a pixel with the wind.
 * @param {Surface} frame
 * @param {Clump[]} canopy
 * @param {number} t     seconds
 * @param {number} wind  0..1
 */
export function drawCanopy(frame, canopy, t, wind) {
  const amplitude = 0.62 + wind * 1.3;
  for (const clump of canopy) {
    const sway = Math.round(clamp(Math.sin(t * CANOPY_SWAY_RATE * (1 + wind) + clump.phase) * amplitude, -2, 2));
    blit(frame, clump.drawn, clump.x + sway, clump.y, clump.reach);
  }
}
