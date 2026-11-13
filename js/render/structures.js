/**
 * Everything the survivors build. Each structure is drawn once into a small
 * sprite, self-shadowed so the side facing the fire catches the light, and
 * owns a fixed, pre-planned spot so the finished camp never crowds the fire
 * or the ring of seats.
 */

import { W, H, FIRE_X, FIRE_Y } from './constants.js';
import { MAT } from './palette.js';
import { Surface, shadeToward } from './surface.js';
import { groundReach } from './light.js';
import { hash2 } from './util.js';

/**
 * @typedef {object} Placed  a sprite with its position in the scene
 * @property {Surface} sprite
 * @property {number} x      left edge on screen
 * @property {number} y      top edge on screen
 * @property {number} reach  absolute firelight reach of the sprite's base
 * @property {number} depth  draw order: row of the base on screen
 */

/**
 * @typedef {object} Spot
 * @property {number} x      centre of the footprint
 * @property {number} y      row of the base
 * @property {() => Surface} draw
 * @property {number} shade  reach added per pixel of self-shadow depth
 */

const STRUCTURE_REACH_SCALE = 0.5;
const SHADE_DEPTH = 22;
/** Snow settles on roofs early; the value is the cold (0..255) it appears at. */
const ROOF_SNOW = 70;
const FLAT_SNOW = 120;
const DRAW_FIRST = -1;
const DRAW_LAST = H + 1;

const PALISADE = { cx: 160, cy: 110, rx: 150, ry: 66, spacing: 3, gateAngle: 1.8, gateHalfWidth: 0.075 };
const PALISADE_REACH_SCALE = 0.75;
const STAKE_HEIGHT = 9;

const WOODPILE = { x: 214, y: 124 };
/** Logs per row of the pile, bottom row first. */
const WOODPILE_ROWS = [5, 4, 3];
export const WOODPILE_MAX = WOODPILE_ROWS.reduce((a, b) => a + b, 0);
const LOG_W = 4;
const LOG_H = 3;

const snowAt = (x, y, base) => base + Math.floor(hash2(x, y, 90) * 50);

function drawCabin() {
  const s = new Surface(48, 40);
  for (let y = 0; y < 16; y++) {
    const inset = Math.round((15 - y) * 0.4);
    for (let x = inset; x < 48 - inset; x++) {
      const seam = y % 4 === 3 || (x + (y >> 2) * 3) % 7 === 0;
      s.set(x, y, seam ? MAT.WOOD_D : MAT.WOOD, 18, snowAt(x, y, ROOF_SNOW + y * 4));
    }
  }
  s.rect(9, 5, 10, 6, MAT.RUST, 18, ROOF_SNOW + 30);
  s.rect(9, 5, 10, 1, MAT.METAL_D, 18, ROOF_SNOW + 30);
  s.rect(6, 0, 36, 1, MAT.WOOD_L, 10, ROOF_SNOW);
  s.rect(37, 1, 5, 8, MAT.STONE, 10);
  s.rect(41, 1, 1, 8, MAT.STONE_D, 20);
  s.rect(36, 0, 7, 1, MAT.STONE_D, 10, ROOF_SNOW);
  for (let y = 16; y < 40; y++) {
    const course = (y - 16) % 3;
    const mat = y === 16 ? MAT.WOOD_D : course === 0 ? MAT.WOOD_L : course === 1 ? MAT.WOOD : MAT.WOOD_D;
    s.rect(3, y, 42, 1, mat);
    if (course === 1) {
      s.set(2, y, MAT.WOOD_END);
      s.set(45, y, MAT.WOOD_END);
    }
  }
  s.rect(19, 24, 10, 16, MAT.WOOD_D);
  s.rect(20, 25, 8, 15, MAT.INTERIOR, 40);
  s.rect(32, 21, 8, 8, MAT.WOOD_D);
  s.rect(33, 22, 6, 6, MAT.WINDOW);
  s.rect(35, 22, 1, 6, MAT.WOOD_D);
  s.rect(33, 24, 6, 1, MAT.WOOD_D);
  return s;
}

function drawBunkhouse() {
  // Three rows of headroom above the roof for the stovepipe.
  const top = 3;
  const s = new Surface(44, 29);
  for (let y = 0; y < 10; y++) {
    const inset = Math.round((9 - y) * 0.6);
    for (let x = inset; x < 44 - inset; x++) {
      const seam = x % 5 === 0 || y === 9;
      s.set(x, top + y, seam ? MAT.BARK_D : MAT.BARK, 16, snowAt(x, y, ROOF_SNOW + y * 5));
    }
  }
  s.rect(5, top, 34, 1, MAT.WOOD_L, 10, ROOF_SNOW);
  s.rect(33, 0, 2, top + 3, MAT.METAL_D, 8);
  for (let y = top + 10; y < 29; y++) {
    const course = (y - top - 10) % 3;
    const mat = y === top + 10 ? MAT.WOOD_D : course === 0 ? MAT.WOOD_L : course === 1 ? MAT.WOOD : MAT.WOOD_D;
    s.rect(2, y, 40, 1, mat);
    if (course === 1) {
      s.set(1, y, MAT.WOOD_END);
      s.set(42, y, MAT.WOOD_END);
    }
  }
  s.rect(19, top + 15, 7, 11, MAT.WOOD_D);
  s.rect(20, top + 16, 5, 10, MAT.INTERIOR, 40);
  for (const x of [6, 32]) {
    s.rect(x, top + 13, 6, 5, MAT.WOOD_D);
    s.rect(x + 1, top + 14, 4, 3, MAT.WINDOW);
  }
  return s;
}

function drawLeanto() {
  const s = new Surface(32, 22);
  for (let x = 2; x <= 27; x++) {
    const top = Math.round(19 - ((x - 2) * 17) / 25);
    for (let y = top + 4; y <= 20; y++) s.set(x, y, MAT.INTERIOR, 34);
    const seam = x % 6 === 0;
    for (let d = 0; d < 3; d++) {
      s.set(x, top + d, seam ? MAT.TARP_D : MAT.TARP, d * 5, d < 2 ? snowAt(x, top, ROOF_SNOW + d * 30) : 0);
    }
    s.set(x, top + 3, MAT.TARP_D, 16);
  }
  s.rect(13, 18, 12, 2, MAT.CLOTH, 10);
  s.rect(13, 20, 12, 1, MAT.TARP_D, 16);
  s.rect(28, 1, 2, 21, MAT.WOOD);
  s.rect(29, 1, 1, 21, MAT.WOOD_L);
  s.line(1, 21, 6, 17, MAT.WOOD_D, 20);
  return s;
}

function drawRack() {
  const s = new Surface(24, 16);
  for (const x of [2, 21]) {
    s.line(x - 2, 15, x, 1, MAT.WOOD);
    s.line(x + 2, 15, x, 1, MAT.WOOD_D);
  }
  s.rect(1, 2, 22, 1, MAT.WOOD_L, 0, FLAT_SNOW);
  for (let i = 0; i < 5; i++) {
    const length = 3 + ((i * 5) % 4);
    s.rect(5 + i * 3, 3, 2, length, i % 2 ? MAT.RUST : MAT.MEAT);
  }
  return s;
}

function drawRaincatcher() {
  const s = new Surface(22, 18);
  s.rect(3, 2, 1, 11, MAT.WOOD_D);
  s.rect(18, 2, 1, 11, MAT.WOOD_D);
  s.rect(8, 10, 6, 8, MAT.METAL_D);
  s.rect(8, 10, 6, 1, MAT.METAL);
  s.rect(8, 14, 6, 1, MAT.RUST);
  for (let y = 2; y <= 8; y++) {
    const flare = Math.round((y - 2) * 0.35);
    for (let x = 3 - flare; x <= 18 + flare; x++) {
      const sag = ((x - 10.5) / 5) ** 2 + ((y - 5.5) / 2.4) ** 2 < 1;
      s.set(x, y, sag ? MAT.TARP_D : MAT.TARP, sag ? 14 : 4, snowAt(x, y, FLAT_SNOW));
    }
  }
  s.rect(1, 8, 1, 10, MAT.WOOD);
  s.rect(20, 8, 1, 10, MAT.WOOD);
  return s;
}

/** The store shed: a bark roof on four posts over a stack of cut logs. */
function drawShed() {
  const s = new Surface(26, 20);
  s.rect(2, 5, 22, 13, MAT.INTERIOR, 34);
  for (let row = 0; row < 3; row++) {
    const y = 15 - row * 3;
    for (let i = 0; i < 4; i++) {
      // Logs seen end-on, like the woodpile: a pale cut face in dark bark.
      const x = 4 + i * 4 + (row % 2) * 2;
      s.rect(x, y, 3, 2, MAT.WOOD, 12);
      s.set(x + 1, y, MAT.WOOD_END, 8);
    }
  }
  s.rect(1, 18, 24, 2, MAT.WOOD_D);
  s.rect(1, 18, 24, 1, MAT.WOOD_L);
  for (const x of [1, 23]) s.rect(x, 3, 2, 16, MAT.WOOD_D);
  for (let x = 0; x < 26; x++) {
    const top = Math.round((x * 4) / 25);
    const seam = x % 5 === 0;
    for (let d = 0; d < 3; d++) {
      s.set(x, top + d, seam ? MAT.WOOD_D : MAT.WOOD, d * 5, d < 2 ? snowAt(x, top, ROOF_SNOW + d * 30) : 0);
    }
  }
  return s;
}

function drawSnares() {
  const s = new Surface(40, 12);
  for (const ox of [1, 15, 29]) {
    s.line(ox, 11, ox + 1, 3, MAT.WOOD);
    s.line(ox + 1, 3, ox + 5, 1, MAT.WOOD_L);
    s.line(ox + 5, 2, ox + 6, 7, MAT.ROPE);
    for (const [dx, dy] of [[5, 9], [8, 9], [6, 8], [7, 8], [6, 10], [7, 10]]) s.set(ox + dx, dy, MAT.ROPE);
    s.rect(ox + 10, 9, 1, 3, MAT.WOOD_D);
  }
  return s;
}

function drawWorkbench() {
  const s = new Surface(26, 14);
  s.rect(1, 4, 24, 3, MAT.WOOD_L, 0, FLAT_SNOW);
  s.rect(1, 7, 24, 2, MAT.WOOD);
  s.rect(2, 9, 2, 5, MAT.WOOD_D);
  s.rect(22, 9, 2, 5, MAT.WOOD_D);
  s.rect(4, 11, 18, 1, MAT.WOOD_D, 12);
  s.rect(4, 1, 6, 3, MAT.METAL_D);
  s.rect(4, 1, 6, 1, MAT.METAL);
  s.rect(12, 2, 2, 2, MAT.RUST);
  s.line(16, 3, 22, 2, MAT.METAL);
  s.rect(19, 5, 4, 1, MAT.WOOD_D);
  return s;
}

function drawGarden() {
  const s = new Surface(46, 22);
  for (let x = 0; x < 46; x += 9) {
    s.rect(x, 0, 1, 4, MAT.WOOD);
    s.rect(x, 18, 1, 4, MAT.WOOD_L);
  }
  s.rect(0, 1, 46, 1, MAT.WOOD_D);
  s.rect(0, 19, 46, 1, MAT.WOOD);
  for (const y of [7, 13]) {
    s.rect(0, y, 1, 3, MAT.WOOD);
    s.rect(45, y, 1, 3, MAT.WOOD);
  }
  for (const y of [4, 8, 12, 16]) {
    s.rect(3, y, 40, 2, MAT.SOIL, 0, FLAT_SNOW + 30);
    s.rect(3, y + 2, 40, 1, MAT.SOIL_D, 8);
    for (let x = 4; x < 42; x += 3) {
      const grown = hash2(x, y, 14);
      if (grown < 0.78) s.set(x, y - 1, MAT.SPROUT);
      if (grown < 0.3) s.set(x + 1, y - 2, MAT.SPROUT);
    }
  }
  return s;
}

function drawSmokehouse() {
  const s = new Surface(20, 28);
  for (let y = 0; y < 10; y++) {
    const inset = Math.round((9 - y) * 0.85);
    for (let x = inset; x < 20 - inset; x++) {
      s.set(x, y, (x + y) % 4 === 0 ? MAT.WOOD_D : MAT.THATCH_D, 16, snowAt(x, y, ROOF_SNOW + y * 5));
    }
  }
  s.rect(13, 0, 2, 5, MAT.METAL_D, 8);
  for (let y = 10; y < 28; y++) {
    for (let x = 2; x < 18; x++) s.set(x, y, y === 10 || x % 3 === 0 ? MAT.WOOD_D : MAT.WOOD);
  }
  s.rect(7, 17, 6, 11, MAT.INTERIOR, 40);
  s.rect(8, 18, 1, 3, MAT.MEAT, 20);
  s.rect(11, 18, 1, 4, MAT.MEAT, 20);
  return s;
}

function drawWatchtower() {
  const s = new Surface(24, 60);
  for (const x of [7, 16]) s.rect(x, 20, 1, 36, MAT.WOOD_D, 20);
  for (const [x0, y0, x1, y1] of [[3, 58, 20, 42], [20, 58, 3, 42], [3, 40, 20, 24], [20, 40, 3, 24]]) {
    s.line(x0, y0, x1, y1, MAT.WOOD_D, 10);
  }
  for (const x of [2, 20]) {
    s.rect(x, 20, 2, 40, MAT.WOOD);
    s.rect(x, 20, 1, 40, MAT.WOOD_L);
  }
  for (let y = 22; y < 59; y += 3) s.rect(10, y, 4, 1, MAT.WOOD_L);
  for (let y = 0; y < 6; y++) {
    for (let x = 5 - y; x < 19 + y; x++) {
      s.set(x, y, (x + y) % 5 === 0 ? MAT.WOOD_D : MAT.THATCH_D, 14, snowAt(x, y, ROOF_SNOW + y * 6));
    }
  }
  s.rect(2, 6, 1, 6, MAT.WOOD_D);
  s.rect(21, 6, 1, 6, MAT.WOOD_D);
  s.rect(0, 12, 24, 1, MAT.WOOD_L);
  for (let x = 0; x < 24; x++) s.rect(x, 13, 1, 5, x % 4 === 3 ? MAT.WOOD_D : MAT.WOOD);
  s.rect(0, 18, 24, 1, MAT.WOOD_L);
  s.rect(0, 19, 24, 1, MAT.WOOD_D, 16);
  return s;
}

const RADIO_SIZE = { w: 28, h: 66 };
const RADIO_MAST_X = 14;

function drawRadio() {
  const s = new Surface(RADIO_SIZE.w, RADIO_SIZE.h);
  for (const endX of [0, 27]) {
    for (let i = 0; i <= 47; i += 2) {
      s.set(Math.round(RADIO_MAST_X + ((endX - RADIO_MAST_X) * i) / 47), 18 + i, MAT.ROPE, 20);
    }
  }
  for (let y = 6; y < 66; y++) {
    s.set(13, y, MAT.METAL_D);
    s.set(15, y, MAT.METAL_D);
    if (y % 4 === 0) s.set(14, y, MAT.METAL);
    if (y % 8 === 2) s.set(y % 16 === 2 ? 13 : 15, y, MAT.METAL);
  }
  s.rect(RADIO_MAST_X, 1, 1, 5, MAT.METAL);
  s.rect(8, 9, 13, 1, MAT.METAL);
  s.rect(10, 14, 9, 1, MAT.METAL);
  s.rect(11, 19, 7, 1, MAT.METAL_D);
  s.rect(9, 58, 11, 8, MAT.RUST);
  s.rect(9, 58, 11, 1, MAT.METAL, 0, FLAT_SNOW);
  s.rect(10, 60, 4, 3, MAT.METAL_D);
  return s;
}

/* ---------- the notebook's buildings ---------- */

/** A ring of stones with a windlass and a bucket on a rope. */
function drawWell() {
  const s = new Surface(18, 20);
  s.rect(2, 2, 1, 11, MAT.WOOD_D);
  s.rect(15, 2, 1, 11, MAT.WOOD_D);
  s.rect(1, 1, 16, 2, MAT.WOOD, 0, FLAT_SNOW);
  s.rect(1, 1, 16, 1, MAT.WOOD_L, 0, FLAT_SNOW);
  s.rect(6, 4, 6, 2, MAT.WOOD_L);
  s.rect(8, 4, 2, 2, MAT.ROPE);
  s.rect(8, 6, 1, 5, MAT.ROPE, 8);
  s.rect(7, 10, 3, 3, MAT.METAL_D);
  s.rect(7, 10, 3, 1, MAT.METAL);
  for (let y = 12; y < 20; y++) {
    for (let x = 1; x < 17; x++) {
      const brick = (x + (y % 2) * 2) % 4 === 0 || y === 12;
      s.set(x, y, brick ? MAT.STONE_D : MAT.STONE, 0, y === 12 ? FLAT_SNOW : 0);
    }
  }
  s.rect(3, 12, 12, 1, MAT.INTERIOR, 30);
  return s;
}

/** A squat dome of stone and clay, smoke hole on top, a glowing mouth. */
function drawKiln() {
  const s = new Surface(22, 18);
  for (let y = 0; y < 18; y++) {
    const half = Math.round(Math.sqrt(Math.max(0, 1 - ((17 - y) / 17) ** 2)) * 10);
    for (let x = 11 - half; x <= 10 + half; x++) {
      const seam = (x * 3 + y * 5) % 7 === 0;
      s.set(x, y, seam ? MAT.STONE_D : MAT.STONE, 0, y < 6 ? snowAt(x, y, ROOF_SNOW + y * 10) : 0);
    }
  }
  s.rect(9, 0, 4, 2, MAT.CHAR);
  s.rect(7, 11, 8, 7, MAT.CHAR);
  s.rect(8, 13, 6, 5, MAT.EMBER_D);
  s.rect(9, 15, 4, 3, MAT.EMBER);
  s.rect(0, 16, 4, 2, MAT.CHAR);
  s.rect(18, 16, 4, 2, MAT.WOOD_D);
  return s;
}

/** A small clean hut with a red-cross cloth on the door and a lit window. */
function drawInfirmary() {
  const s = new Surface(34, 28);
  for (let y = 0; y < 10; y++) {
    const inset = Math.round((9 - y) * 0.7);
    for (let x = inset; x < 34 - inset; x++) {
      s.set(x, y, x % 4 === 0 || y === 9 ? MAT.WOOD_D : MAT.THATCH, 16, snowAt(x, y, ROOF_SNOW + y * 5));
    }
  }
  for (let y = 10; y < 28; y++) {
    for (let x = 2; x < 32; x++) s.set(x, y, y === 10 || x % 5 === 0 ? MAT.WOOD_D : MAT.WOOD_L);
  }
  s.rect(13, 15, 8, 13, MAT.WOOD_D);
  s.rect(14, 16, 6, 12, MAT.CLOTH, 6);
  s.rect(16, 18, 2, 6, MAT.MEAT);
  s.rect(14, 20, 6, 2, MAT.MEAT);
  s.rect(24, 15, 6, 6, MAT.WOOD_D);
  s.rect(25, 16, 4, 4, MAT.WINDOW);
  s.rect(4, 15, 6, 6, MAT.WOOD_D);
  s.rect(5, 16, 4, 4, MAT.WINDOW);
  return s;
}

/** Salvaged window panes over a box of dark earth, green showing through. */
function drawColdframe() {
  const s = new Surface(30, 12);
  for (let y = 0; y < 12; y++) {
    const back = Math.round((11 - y) * 0.2);
    for (let x = back; x < 30 - back; x++) {
      const frame = y === 0 || y === 6 || y === 11 || x === back || x === 29 - back || x % 7 === 0;
      if (y >= 7) s.set(x, y, frame ? MAT.WOOD_D : MAT.WOOD);
      else s.set(x, y, frame ? MAT.WOOD_L : (x + y) % 5 === 0 ? MAT.SPROUT : MAT.WINDOW, frame ? 0 : 10, frame ? FLAT_SNOW : 0);
    }
  }
  for (let x = 2; x < 28; x += 3) s.set(x, 5, MAT.SPROUT);
  return s;
}

/** Steps into the hillside, a plank door under a mound of turf. */
function drawCellar() {
  const s = new Surface(26, 16);
  for (let y = 0; y < 16; y++) {
    const half = Math.round(Math.sqrt(Math.max(0, 1 - ((15 - y) / 15) ** 2)) * 13);
    for (let x = 13 - half; x < 13 + half; x++) {
      s.set(x, y, (x + y * 3) % 6 === 0 ? MAT.GRASS_D : MAT.GRASS, 12, snowAt(x, y, FLAT_SNOW - 20 + y * 6));
    }
  }
  s.rect(8, 6, 10, 10, MAT.STONE_D);
  s.rect(9, 7, 8, 9, MAT.WOOD_D);
  for (let y = 8; y < 16; y += 2) s.rect(9, y, 8, 1, MAT.WOOD);
  s.set(15, 11, MAT.METAL);
  return s;
}

/** A low hut of turf and hides around a pit of stones, steam rising. */
function drawSauna() {
  const s = new Surface(28, 20);
  for (let y = 0; y < 8; y++) {
    const inset = Math.round((7 - y) * 1.1);
    for (let x = inset; x < 28 - inset; x++) {
      s.set(x, y, (x + y) % 5 === 0 ? MAT.GRASS_D : MAT.GRASS, 14, snowAt(x, y, ROOF_SNOW + y * 8));
    }
  }
  for (let y = 8; y < 20; y++) {
    for (let x = 2; x < 26; x++) s.set(x, y, (x + y * 2) % 7 === 0 ? MAT.TARP_D : MAT.CLOTH, 6);
  }
  s.rect(2, 8, 24, 1, MAT.WOOD_D);
  s.rect(11, 12, 6, 8, MAT.INTERIOR, 40);
  s.rect(12, 16, 4, 4, MAT.EMBER_D);
  for (const x of [0, 25]) s.rect(x, 15, 3, 5, MAT.STONE);
  return s;
}

/** Benches under a roof, a slate on the wall, a window facing the fire. */
function drawSchool() {
  const s = new Surface(40, 30);
  for (let y = 0; y < 11; y++) {
    const inset = Math.round((10 - y) * 0.75);
    for (let x = inset; x < 40 - inset; x++) {
      s.set(x, y, x % 4 === 0 || y === 10 ? MAT.WOOD_D : MAT.BARK, 16, snowAt(x, y, ROOF_SNOW + y * 5));
    }
  }
  s.rect(19, 0, 2, 3, MAT.WOOD_L);
  s.rect(18, 1, 4, 1, MAT.METAL);
  for (let y = 11; y < 30; y++) {
    const course = (y - 11) % 3;
    s.rect(2, y, 36, 1, course === 0 ? MAT.WOOD_L : course === 1 ? MAT.WOOD : MAT.WOOD_D);
  }
  s.rect(16, 18, 8, 12, MAT.WOOD_D);
  s.rect(17, 19, 6, 11, MAT.INTERIOR, 40);
  for (const x of [5, 28]) {
    s.rect(x, 15, 7, 6, MAT.WOOD_D);
    s.rect(x + 1, 16, 5, 4, MAT.WINDOW);
  }
  s.rect(7, 24, 5, 3, MAT.CHAR);
  s.set(8, 25, MAT.CLOTH);
  s.set(10, 25, MAT.CLOTH);
  return s;
}

/** Stone on stone at the edge of the clearing. */
function drawCairn() {
  const s = new Surface(14, 16);
  const stones = [[2, 12, 10, 4], [3, 9, 8, 3], [4, 6, 6, 3], [5, 3, 4, 3], [6, 1, 2, 2]];
  for (const [x, y, w, h] of stones) {
    s.rect(x, y, w, h, MAT.STONE, 0, FLAT_SNOW - 30);
    s.rect(x, y + h - 1, w, 1, MAT.STONE_D);
    s.set(x + w - 1, y, MAT.STONE_D);
  }
  s.rect(0, 15, 14, 1, MAT.STONE_D, 10);
  return s;
}

/** @type {Record<string, Spot>} */
const SPOTS = {
  cabin: { x: 66, y: 86, draw: drawCabin, shade: 2 },
  bunkhouse: { x: 160, y: 66, draw: drawBunkhouse, shade: 2 },
  smokehouse: { x: 110, y: 72, draw: drawSmokehouse, shade: 3 },
  workbench: { x: 208, y: 78, draw: drawWorkbench, shade: 2 },
  watchtower: { x: 250, y: 88, draw: drawWatchtower, shade: 4 },
  radio: { x: 286, y: 102, draw: drawRadio, shade: 6 },
  leanto: { x: 36, y: 118, draw: drawLeanto, shade: 2 },
  rack: { x: 84, y: 138, draw: drawRack, shade: 3 },
  raincatcher: { x: 50, y: 146, draw: drawRaincatcher, shade: 3 },
  garden: { x: 256, y: 132, draw: drawGarden, shade: 1 },
  snares: { x: 272, y: 152, draw: drawSnares, shade: 3 },
  shed: { x: 204, y: 156, draw: drawShed, shade: 2 },
  well: { x: 106, y: 164, draw: drawWell, shade: 2 },
  kiln: { x: 96, y: 108, draw: drawKiln, shade: 3 },
  infirmary: { x: 34, y: 66, draw: drawInfirmary, shade: 2 },
  coldframe: { x: 172, y: 150, draw: drawColdframe, shade: 1 },
  cellar: { x: 64, y: 108, draw: drawCellar, shade: 2 },
  sauna: { x: 232, y: 106, draw: drawSauna, shade: 2 },
  school: { x: 214, y: 58, draw: drawSchool, shade: 2 },
  cairn: { x: 80, y: 158, draw: drawCairn, shade: 2 },
};

/** Every structure id the scene understands. */
export const STRUCTURE_IDS = Object.freeze([...Object.keys(SPOTS), 'palisade']);

/** Where the radio mast's beacon lamp sits on screen. */
export const BEACON_POS = Object.freeze({
  x: SPOTS.radio.x - (RADIO_SIZE.w >> 1) + RADIO_MAST_X,
  y: SPOTS.radio.y - RADIO_SIZE.h + 1,
});
/** Where the smokehouse vents. */
export const SMOKEHOUSE_VENT = Object.freeze({ x: SPOTS.smokehouse.x + 4, y: SPOTS.smokehouse.y - 28 });

/** @returns {Placed} */
function place(sprite, x, y, shade) {
  const toFire = Math.hypot(FIRE_X - x, FIRE_Y - y) || 1;
  if (shade > 0) shadeToward(sprite, (FIRE_X - x) / toFire, (FIRE_Y - y) / toFire, shade, SHADE_DEPTH);
  return {
    sprite,
    x: x - (sprite.w >> 1),
    y: y - sprite.h + 1,
    reach: Math.round(groundReach(x, y) * STRUCTURE_REACH_SCALE),
    depth: y,
  };
}

/**
 * The stake wall, as two full-screen sprites: the far arc (drawn behind the
 * camp) and the near arc (drawn in front of it). Stakes never cover a trunk.
 * @param {Surface} trunks
 * @returns {Placed[]}
 */
function buildPalisade(trunks) {
  const { cx, cy, rx, ry } = PALISADE;
  const stakes = [];
  let last = null;
  for (let angle = 0; angle < Math.PI * 2; angle += 0.004) {
    if (Math.abs(angle - PALISADE.gateAngle) < PALISADE.gateHalfWidth) continue;
    const x = Math.round(cx + Math.cos(angle) * rx);
    const y = Math.round(cy + Math.sin(angle) * ry);
    if (last && Math.hypot(x - last.x, y - last.y) < PALISADE.spacing) continue;
    last = { x, y };
    stakes.push(last);
  }
  stakes.sort((a, b) => a.y - b.y);

  const back = new Surface(W, H);
  const front = new Surface(W, H);
  for (const { x, y } of stakes) {
    const far = y < cy;
    const s = far ? back : front;
    const height = STAKE_HEIGHT + Math.floor(hash2(x, y, 70) * 3);
    const top = y - height;
    const reach = Math.round(groundReach(x, y) * PALISADE_REACH_SCALE);
    const litColumn = x < FIRE_X ? 2 : 0;
    for (let column = 0; column < 3; column++) {
      const distance = Math.abs(column - litColumn);
      // The far arc shows its lit faces; the near arc is seen from behind.
      const mat = far ? [MAT.WOOD_L, MAT.WOOD, MAT.WOOD_D][distance] : distance === 0 ? MAT.WOOD : MAT.WOOD_D;
      for (let py = top; py <= y; py++) {
        s.set(x + column - 1, py, py === top + 3 ? MAT.WOOD_D : mat, reach + distance * 14 + (far ? 0 : 46));
      }
    }
    s.set(x, top - 1, MAT.WOOD_L, reach, FLAT_SNOW);
    s.set(x - 1, top, MAT.WOOD_L, reach, FLAT_SNOW + 40);
    s.set(x + 1, top, MAT.WOOD_L, reach, FLAT_SNOW + 40);
  }
  for (const s of [back, front]) {
    for (let i = 0; i < s.mat.length; i++) if (trunks.mat[i]) s.mat[i] = MAT.NONE;
  }
  return [
    { sprite: back, x: 0, y: 0, reach: 0, depth: DRAW_FIRST },
    { sprite: front, x: 0, y: 0, reach: 0, depth: DRAW_LAST },
  ];
}

/**
 * Pre-renders every structure.
 * @param {Surface} trunks  the trunk layer, which the palisade must not cover
 * @returns {Map<string, Placed[]>} sprites to draw for each structure id
 */
export function createStructures(trunks) {
  /** @type {Map<string, Placed[]>} */
  const structures = new Map();
  for (const [id, spot] of Object.entries(SPOTS)) {
    structures.set(id, [place(spot.draw(), spot.x, spot.y, spot.shade)]);
  }
  structures.set('palisade', buildPalisade(trunks));
  return structures;
}

/** Screen position of a structure's footprint, for dust and accents. */
export function structureCentre(id) {
  const spot = SPOTS[id];
  return spot ? { x: spot.x, y: spot.y } : { x: PALISADE.cx, y: PALISADE.cy + PALISADE.ry - 8 };
}

/**
 * The log pile beside the fire.
 * @param {number} logs 0..WOODPILE_MAX
 * @returns {Placed}
 */
export function buildWoodpile(logs) {
  const s = new Surface(WOODPILE_ROWS[0] * LOG_W + 1, WOODPILE_ROWS.length * LOG_H + 1);
  let remaining = logs;
  WOODPILE_ROWS.forEach((count, row) => {
    const y = s.h - (row + 1) * LOG_H + 1;
    for (let i = 0; i < count && remaining > 0; i++, remaining--) {
      // Logs are seen end-on: a pale ring of cut wood inside dark bark.
      const x = 1 + row * (LOG_W >> 1) + i * LOG_W;
      s.rect(x - 1, y - 1, LOG_W + 1, LOG_H + 1, MAT.OUTLINE, 30);
      s.rect(x, y - 1, LOG_W - 1, 1, MAT.WOOD_L, 0, FLAT_SNOW + 30);
      s.set(x, y, MAT.WOOD);
      s.set(x + 1, y, MAT.WOOD_END);
      s.set(x + 2, y, MAT.WOOD);
      s.rect(x, y + 1, LOG_W - 1, 1, MAT.WOOD_D, 8);
    }
  });
  return place(s, WOODPILE.x, WOODPILE.y, 3);
}
