/**
 * The survivors. Each figure is assembled from small pixel-map templates,
 * coloured from its seed, self-shadowed for its seat so the side facing the
 * fire glows, and given a little life: breathing, glancing around, walking in
 * from the treeline instead of popping into existence.
 */

import { FIRE_X, FIRE_Y, GROUND_SQUASH, REACH_NEVER, W } from './constants.js';
import { MAT, SKINS, HAIRS, HAIRS_SH, COATS, COATS_SH, BLANKETS, BLANKETS_SH, LEGS, IS_GROUND } from './palette.js';
import { Surface, blit, shadeToward, OPAQUE } from './surface.js';
import { groundReach } from './light.js';
import { finite, hashId, mulberry32 } from './util.js';

/**
 * @typedef {object} Template
 * @property {string[]} rows  pixel map; see GLYPHS for the legend
 * @property {number} head    number of rows making up the head (0 = none)
 * @property {number} chest   row duplicated when the figure breathes in or is tall
 */

/**
 * Legend: h hair/hood, s skin, e eye, c coat, C coat shadow, l legs, b boots,
 * k blanket, K blanket shadow, o dark outline, t tool metal, w wood, . empty.
 * Side-on templates face right.
 * @type {Record<string, Template>}
 */
const TEMPLATES = {
  stand: {
    head: 5,
    chest: 7,
    rows: [
      '..hhhh..',
      '.hhhhhh.',
      '.hssssh.',
      '.sesses.',
      '..ssss..',
      '.cccccc.',
      'cccccccc',
      'cCccccCc',
      'cCccccCc',
      'sCccccCs',
      '.cccccc.',
      '.cCccCc.',
      '.ll..ll.',
      '.ll..ll.',
      '.bb..bb.',
    ],
  },
  sitFacing: {
    head: 5,
    chest: 7,
    rows: [
      '..hhhh..',
      '.hhhhhh.',
      '.hssssh.',
      '.sesses.',
      '..ssss..',
      '.cccccc.',
      'cccccccc',
      'cCccccCc',
      '.sCccCs.',
      'llllllll',
      'bll..llb',
    ],
  },
  sitSide: {
    head: 4,
    chest: 5,
    rows: [
      '.hhhh....',
      'hhhhhs...',
      'hhhsse...',
      '.hhsss...',
      '.cccc....',
      'ccccc....',
      'cccccc...',
      'cCcccss..',
      'cCcclll..',
      '.ccllllb.',
      '..oollbb.',
    ],
  },
  sleep: {
    head: 0,
    chest: 1,
    rows: [
      '.hhh............',
      'hhhhkkkkkkkkk...',
      'hsshkkkKkkkkkkk.',
      'hsskkkKkkkkKkkbb',
      '.ookkkkkkkkkkko.',
    ],
  },
  tend: {
    head: 4,
    chest: 5,
    rows: [
      '..hhhh....',
      '.hhhhhs...',
      '.hhhsse...',
      '..hhss....',
      '.cccc.....',
      'ccccccss..',
      'cCcccc..ww',
      'cCclll....',
      '.cllll....',
      '.bb.bb....',
    ],
  },
  workUp: {
    head: 0,
    chest: 7,
    rows: [
      '..........',
      '..hhhh..t.',
      '.hhhhhs.t.',
      '.hhhsse.w.',
      '..hhss.cs.',
      '.ccccccc..',
      '.cccccc...',
      'cCcccc....',
      'cCcccc....',
      '.cccc.....',
      '.cccc.....',
      '.ll.ll....',
      '.ll.ll....',
      '.bb.bb....',
    ],
  },
  workDown: {
    head: 0,
    chest: 7,
    rows: [
      '..........',
      '..........',
      '..hhhh....',
      '.hhhhhs...',
      '.hhhsse...',
      '..hhss....',
      '.cccccc...',
      'cCccccss..',
      'cCcccc.wt.',
      '.cccc...t.',
      '.cccc.....',
      '.ll.ll....',
      '.ll.ll....',
      '.bb.bb....',
    ],
  },
  walkStride: {
    head: 0,
    chest: 6,
    rows: [
      '..hhhh..',
      '.hhhhhs.',
      '.hhhsse.',
      '..hhsss.',
      '..cccc..',
      '.cccccc.',
      '.cCcccc.',
      '.cCccccs',
      '.cCcccc.',
      '.sccccc.',
      '..cccc..',
      '..ll.ll.',
      '.ll...ll',
      '.l....l.',
      'bb....bb',
    ],
  },
  walkPass: {
    head: 0,
    chest: 6,
    rows: [
      '..hhhh..',
      '.hhhhhs.',
      '.hhhsse.',
      '..hhsss.',
      '..cccc..',
      '.cccccc.',
      '.cCcccc.',
      '.cCcccc.',
      '.cscccc.',
      '.cccccc.',
      '..cccc..',
      '..llll..',
      '..llll..',
      '...ll...',
      '...bbb..',
    ],
  },
};

/** Transparent border around every figure sprite, filled by its outline. */
const OUTLINE_PAD = 1;
/** The outline sits in the figure's own shadow and only warms close to the fire. */
const OUTLINE_REACH = 26;
/** Rows of a front-facing head that show the face; from behind they are hair. */
const FACE_ROWS = 4;

const SEAT_RING = { rx: 40, ry: 20 };
/** Sleepers lie a little further out than the sitters, so bedrolls clear the ring. */
const BEDROLL_OFFSET = 0.2;
/** Seat angles in degrees, clockwise from screen-right. Nobody sits directly behind the flames. */
const SEAT_ANGLES = [20, 135, 252, 60, 288, 178, 328, 220];
const PLAYER_ANGLE = 97;
const PLAYER_KEY = 'player';
const PLAYER_SEED = 0x504c5952;
const PLAYER_COAT = 3;
const MAX_PEOPLE = SEAT_ANGLES.length;

/** Where each seat's occupant goes to work, near the camp's structures. */
const WORK_SPOTS = [
  [206, 85], [102, 141], [114, 79], [229, 127], [190, 84], [70, 93], [246, 152], [62, 150],
];
const TEND_SPOT = [146, 112];
/** The gap in the treeline (and the palisade gate) people come and go through. */
const ENTRY = [124, 183];

const WALK_SPEED = 20;
const WALK_FPS = 5;
const WORK_FPS = 2.2;
const ARRIVE_DISTANCE = 0.6;
const FADE_RATE = 13;
/** People leaving start to dissolve this close to the treeline. */
const FADE_DISTANCE = 26;
/** Walkers steer around this ellipse so nobody strolls through the fire. */
const AVOID = { rx: 25, ry: 13 };
/** Figures stand above the ground, so they catch a little more light than it. */
const FIGURE_LIFT = 8;
const SHADE_DEPTH = 10;
const SHADE_FACING = 1.5;
const SHADE_SIDE = 5;
const SHADE_BEHIND = 9;
const SHADOW_STEPS = [[2, 20], [5, 14], [8, 8]];
const BREATH_RATE = 1.9;
const SLEEP_BREATH_RATE = 1.1;

const PEOPLE_POSES = new Set(['sitting', 'sleeping', 'standing', 'working', 'away']);
const PLAYER_POSES = { asleep: 'sleeping', sitting: 'sitting', tending: 'tending', away: 'away' };

/**
 * @typedef {object} Look  colours and build derived from a seed
 * @property {number} skin
 * @property {number} hair
 * @property {number} hairShade
 * @property {number} coat
 * @property {number} coatShade
 * @property {number} blanket
 * @property {number} blanketShade
 * @property {number} legs
 * @property {boolean} tall
 */

/** @returns {Look} */
function lookFor(seed, coatIndex) {
  const rng = mulberry32(seed);
  const pick = (list) => Math.floor(rng() * list.length);
  const coat = coatIndex ?? pick(COATS);
  const hair = pick(HAIRS);
  const hooded = rng() < 0.35;
  const blanket = pick(BLANKETS);
  return {
    skin: SKINS[pick(SKINS)],
    hair: hooded ? COATS[coat] : HAIRS[hair],
    hairShade: hooded ? COATS_SH[coat] : HAIRS_SH[hair],
    coat: COATS[coat],
    coatShade: COATS_SH[coat],
    blanket: BLANKETS[blanket],
    blanketShade: BLANKETS_SH[blanket],
    legs: LEGS[pick(LEGS)],
    tall: rng() < 0.4,
  };
}

/**
 * Turns a template into a coloured sprite.
 * @param {Template} template
 * @param {Look} look
 * @param {{ back?: boolean, flip?: boolean }} [options]
 */
function renderTemplate(template, look, { back = false, flip = false } = {}) {
  const glyphs = {
    h: look.hair, H: look.hairShade, s: look.skin, e: MAT.OUTLINE,
    c: look.coat, C: look.coatShade, l: look.legs, b: MAT.BOOT,
    k: look.blanket, K: look.blanketShade, o: MAT.OUTLINE, t: MAT.METAL, w: MAT.WOOD,
  };
  const rows = template.rows.slice();
  if (look.tall && template !== TEMPLATES.sleep) rows.splice(template.chest, 0, rows[template.chest]);
  const w = rows[0].length;
  const sprite = new Surface(w + OUTLINE_PAD * 2, rows.length + OUTLINE_PAD * 2);
  rows.forEach((row, y) => {
    for (let x = 0; x < w; x++) {
      let glyph = row[flip ? w - 1 - x : x];
      if (glyph === '.') continue;
      if (back && y < FACE_ROWS && (glyph === 's' || glyph === 'e')) glyph = y === FACE_ROWS - 1 ? 'H' : 'h';
      sprite.set(x + OUTLINE_PAD, y + OUTLINE_PAD, glyphs[glyph], 0);
    }
  });
  outline(sprite);
  return sprite;
}

/**
 * @typedef {object} Seat
 * @property {number} x
 * @property {number} y
 * @property {'facing'|'side'|'behind'} view  how the camera sees someone sitting here
 */

/** Wraps a sprite in a one-pixel dark outline so it reads against lit ground. */
function outline(sprite) {
  const { w, h } = sprite;
  const solid = sprite.mat.slice();
  const at = (x, y) => x >= 0 && y >= 0 && x < w && y < h && solid[y * w + x] !== 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (at(x, y)) continue;
      if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)) sprite.set(x, y, MAT.OUTLINE, OUTLINE_REACH);
    }
  }
}

/** @returns {Seat} */
function seatAt(degrees) {
  const a = (degrees * Math.PI) / 180;
  const depth = Math.sin(a);
  return {
    x: Math.round(FIRE_X + Math.cos(a) * SEAT_RING.rx),
    y: Math.round(FIRE_Y + Math.sin(a) * SEAT_RING.ry),
    view: depth < -0.5 ? 'facing' : depth > 0.5 ? 'behind' : 'side',
  };
}

const SEATS = SEAT_ANGLES.map(seatAt);
const PLAYER_SEAT = seatAt(PLAYER_ANGLE);

/**
 * @typedef {object} SpriteSet
 * @property {Surface} sitting
 * @property {Surface} sleeping
 * @property {Surface} standing
 * @property {Surface} tending
 * @property {Surface[]} working
 * @property {Surface[]} walking
 * @property {number} head   head rows of the seated sprites
 * @property {number} chest  breathing row of the seated sprites
 */

/** Builds every pose for one person, lit for their seat. @returns {SpriteSet} */
function buildSprites(look, seat) {
  const toFire = Math.hypot(FIRE_X - seat.x, FIRE_Y - seat.y) || 1;
  const dirX = (FIRE_X - seat.x) / toFire;
  const dirY = (FIRE_Y - seat.y) / toFire;
  const falloff = seat.view === 'facing' ? SHADE_FACING : seat.view === 'side' ? SHADE_SIDE : SHADE_BEHIND;
  const seated = (template, options) => {
    const sprite = renderTemplate(template, look, options);
    shadeToward(sprite, dirX, dirY, falloff, SHADE_DEPTH);
    return sprite;
  };
  // Side-on action poses face right and are mirrored at draw time, so they
  // are lit from the direction they face.
  const acting = (template) => {
    const sprite = renderTemplate(template, look);
    shadeToward(sprite, 1, 0, SHADE_SIDE, SHADE_DEPTH);
    return sprite;
  };
  const back = seat.view === 'behind';
  const flip = seat.x > FIRE_X;
  const sitTemplate = seat.view === 'side' ? TEMPLATES.sitSide : TEMPLATES.sitFacing;
  return {
    sitting: seated(sitTemplate, { back, flip }),
    sleeping: seated(TEMPLATES.sleep, { flip }),
    standing: seated(TEMPLATES.stand, { back }),
    tending: acting(TEMPLATES.tend),
    working: [acting(TEMPLATES.workUp), acting(TEMPLATES.workDown)],
    walking: [acting(TEMPLATES.walkStride), acting(TEMPLATES.walkPass)],
    head: sitTemplate.head + OUTLINE_PAD,
    chest: sitTemplate.chest + OUTLINE_PAD,
  };
}

/**
 * @typedef {object} Figure
 * @property {number} seed
 * @property {number} seatIndex  -1 for the player
 * @property {Seat} seat
 * @property {SpriteSet} sprites
 * @property {string} pose
 * @property {number} x
 * @property {number} y
 * @property {number} alpha     0..OPAQUE dither coverage
 * @property {boolean} moving
 * @property {number} facing    1 right, -1 left
 * @property {boolean} gone     no longer in the view; remove once faded
 * @property {number} phase     animation phase offset
 * @property {number} headDx    current glance offset
 * @property {number} glanceIn  seconds until the head moves again
 */

const insideAvoid = (x, y) => ((x - FIRE_X) / AVOID.rx) ** 2 + ((y - FIRE_Y) / AVOID.ry) ** 2 < 1;

function targetOf(figure) {
  if (figure.pose === 'away') return ENTRY;
  if (figure.pose === 'working' && figure.seatIndex >= 0) return WORK_SPOTS[figure.seatIndex];
  if (figure.pose === 'tending') return TEND_SPOT;
  if (figure.pose === 'sleeping') {
    return [
      Math.round(figure.seat.x + (figure.seat.x - FIRE_X) * BEDROLL_OFFSET),
      Math.round(figure.seat.y + (figure.seat.y - FIRE_Y) * BEDROLL_OFFSET),
    ];
  }
  return [figure.seat.x, figure.seat.y];
}

/** Darkens the lit ground behind a figure, away from the fire. */
function castShadow(frame, x, y) {
  const d = Math.hypot(x - FIRE_X, y - FIRE_Y) || 1;
  const ux = (x - FIRE_X) / d;
  const uy = (y - FIRE_Y) / d / GROUND_SQUASH;
  for (const [step, amount] of SHADOW_STEPS) {
    const cx = Math.round(x + ux * step);
    const cy = Math.round(y + uy * step);
    for (let dy = -1; dy <= 1; dy++) {
      const half = dy === 0 ? 3 : 2;
      for (let dx = -half; dx <= half; dx++) {
        const px = cx + dx;
        const py = cy + dy;
        if (px < 0 || px >= W || py < 0 || py >= frame.h) continue;
        const i = py * W + px;
        if (IS_GROUND[frame.mat[i]]) frame.reach[i] = Math.min(REACH_NEVER - 1, frame.reach[i] + amount);
      }
    }
  }
}

export function createFigures() {
  /** @type {Map<string, Figure>} */
  const figures = new Map();
  /** @type {(string|null)[]} */
  const seatOwners = SEATS.map(() => null);

  function claimSeat(key) {
    const preferred = hashId(key) % SEATS.length;
    for (let i = 0; i < SEATS.length; i++) {
      const index = (preferred + i) % SEATS.length;
      if (seatOwners[index] === null) {
        seatOwners[index] = key;
        return index;
      }
    }
    return -1;
  }

  /** @returns {Figure|null} */
  function ensure(key, seed, pose, instant) {
    let figure = figures.get(key);
    if (figure && figure.seed === seed) return figure;
    const isPlayer = key === PLAYER_KEY;
    const seatIndex = figure ? figure.seatIndex : isPlayer ? -1 : claimSeat(key);
    if (!isPlayer && seatIndex < 0) return null;
    const seat = isPlayer ? PLAYER_SEAT : SEATS[seatIndex];
    const sprites = buildSprites(lookFor(seed, isPlayer ? PLAYER_COAT : undefined), seat);
    if (figure) {
      figure.seed = seed;
      figure.sprites = sprites;
      return figure;
    }
    figure = {
      seed, seatIndex, seat, sprites, pose,
      x: ENTRY[0], y: ENTRY[1], alpha: 0, moving: false, facing: 1, gone: false,
      phase: (hashId(key) % 628) / 100, headDx: 0, glanceIn: 3 + (hashId(key) % 50) / 10,
    };
    if (instant) {
      [figure.x, figure.y] = targetOf(figure);
      figure.alpha = pose === 'away' ? 0 : OPAQUE;
    }
    figures.set(key, figure);
    return figure;
  }

  /**
   * Reconciles the figures with the view.
   * @param {unknown} people   SceneView.people
   * @param {unknown} player   SceneView.player
   * @param {boolean} instant  place newcomers directly (first frame) instead of walking them in
   */
  function sync(people, player, instant) {
    const seen = new Set([PLAYER_KEY]);
    const playerPose = PLAYER_POSES[/** @type {string} */ (player)] ?? 'sitting';
    const self = ensure(PLAYER_KEY, PLAYER_SEED, playerPose, instant);
    self.pose = playerPose;

    const list = Array.isArray(people) ? people : [];
    let counted = 0;
    for (let i = 0; i < list.length && counted < MAX_PEOPLE; i++) {
      const person = list[i];
      if (!person || typeof person !== 'object') continue;
      const key = `p:${String(person.id ?? i)}`;
      if (seen.has(key)) continue;
      const pose = PEOPLE_POSES.has(person.pose) ? person.pose : 'sitting';
      const figure = ensure(key, finite(person.seed, hashId(key)) >>> 0, pose, instant);
      if (!figure) continue;
      figure.pose = pose;
      figure.gone = false;
      seen.add(key);
      counted++;
    }
    for (const [key, figure] of figures) {
      if (seen.has(key)) continue;
      figure.pose = 'away';
      figure.gone = true;
    }
  }

  /** Moves one figure toward its target, steering around the fire. */
  function walk(figure, dt) {
    const [tx, ty] = targetOf(figure);
    const dx = tx - figure.x;
    const dy = ty - figure.y;
    const distance = Math.hypot(dx, dy);
    figure.moving = distance > ARRIVE_DISTANCE;
    if (!figure.moving) return distance;

    const step = Math.min(distance, WALK_SPEED * dt);
    let ux = dx / distance;
    let uy = dy / distance;
    if (!insideAvoid(tx, ty) && insideAvoid(figure.x + ux * (step + 2), figure.y + uy * (step + 2))) {
      // Slide along the ellipse instead of crossing it.
      const rx = (figure.x - FIRE_X) / AVOID.rx ** 2;
      const ry = (figure.y - FIRE_Y) / AVOID.ry ** 2;
      const length = Math.hypot(rx, ry) || 1;
      const side = -ry * ux + rx * uy >= 0 ? 1 : -1;
      ux = (-ry / length) * side + (rx / length) * 0.25;
      uy = (rx / length) * side + (ry / length) * 0.25;
    }
    figure.x += ux * step;
    figure.y += uy * step;
    if (Math.abs(ux) > 0.2) figure.facing = ux > 0 ? 1 : -1;
    return distance;
  }

  /** @param {number} dt seconds */
  function update(dt) {
    for (const [key, figure] of figures) {
      const distance = walk(figure, dt);
      const visible = figure.pose !== 'away' || distance > FADE_DISTANCE;
      figure.alpha = Math.max(0, Math.min(OPAQUE, figure.alpha + (visible ? 1 : -1) * FADE_RATE * dt));
      if (figure.gone && figure.alpha <= 0) {
        if (figure.seatIndex >= 0) seatOwners[figure.seatIndex] = null;
        figures.delete(key);
        continue;
      }
      figure.glanceIn -= dt;
      if (figure.glanceIn <= 0) {
        figure.headDx = figure.headDx ? 0 : Math.random() < 0.5 ? -1 : 1;
        figure.glanceIn = figure.headDx ? 0.8 + Math.random() * 1.4 : 4 + Math.random() * 7;
      }
    }
  }

  function drawFigure(frame, figure, t) {
    const { sprites } = figure;
    const alpha = Math.round(figure.alpha);
    let sprite = sprites.sitting;
    let flip = false;
    let head = 0;
    let chest = -1;
    if (figure.moving) {
      sprite = sprites.walking[Math.floor(t * WALK_FPS + figure.phase) & 1];
      flip = figure.facing < 0;
    } else if (figure.pose === 'working') {
      sprite = sprites.working[Math.floor(t * WORK_FPS + figure.phase) & 1];
      flip = figure.x > FIRE_X;
    } else if (figure.pose === 'tending') {
      sprite = sprites.tending;
    } else if (figure.pose === 'sleeping') {
      sprite = sprites.sleeping;
      if (Math.sin(t * SLEEP_BREATH_RATE + figure.phase) > 0) chest = TEMPLATES.sleep.chest + OUTLINE_PAD;
    } else {
      sprite = figure.pose === 'standing' ? sprites.standing : sprites.sitting;
      head = figure.pose === 'standing' ? TEMPLATES.stand.head + OUTLINE_PAD : sprites.head;
      if (Math.sin(t * BREATH_RATE + figure.phase) > 0.35) {
        chest = figure.pose === 'standing' ? TEMPLATES.stand.chest + OUTLINE_PAD : sprites.chest;
      }
    }

    const fx = Math.round(figure.x);
    const fy = Math.round(figure.y);
    const x = fx - (sprite.w >> 1);
    const y = fy - sprite.h + 1 + OUTLINE_PAD;
    const reach = Math.max(0, Math.round(groundReach(fx, fy)) - FIGURE_LIFT);
    const glance = head > 0 ? figure.headDx : 0;

    if (chest < 0) {
      if (glance) {
        blit(frame, sprite, x, y, reach, flip, alpha, head);
        blit(frame, sprite, x + glance, y, reach, flip, alpha, 0, head);
      } else {
        blit(frame, sprite, x, y, reach, flip, alpha);
      }
      return;
    }
    // Breathing in: everything above the chest rises a pixel and the chest
    // row is drawn twice to fill the gap.
    blit(frame, sprite, x, y, reach, flip, alpha, chest);
    blit(frame, sprite, x, y - 1, reach, flip, alpha, head, chest + 1);
    if (head > 0) blit(frame, sprite, x + glance, y - 1, reach, flip, alpha, 0, head);
  }

  /**
   * Draws the figures on one side of the fire, back to front.
   * @param {Surface} frame
   * @param {boolean} behindFire  true for the pass drawn before the flames
   * @param {number} t            seconds
   */
  function draw(frame, behindFire, t) {
    const visible = [...figures.values()]
      .filter((f) => f.alpha >= 1 && f.y <= FIRE_Y === behindFire)
      .sort((a, b) => a.y - b.y);
    for (const figure of visible) {
      if (figure.alpha > OPAQUE / 2) castShadow(frame, Math.round(figure.x), Math.round(figure.y));
    }
    for (const figure of visible) drawFigure(frame, figure, t);
  }

  return { sync, update, draw };
}
