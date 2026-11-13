/**
 * Every balance number in one place. Rates are per real second unless a name says
 * otherwise; vitals, fire intensity, cold and threat are all fractions in 0..1.
 */

export const TIME = {
  daySeconds: 240,
  /** The game opens in the last dark before the first dawn. */
  startTime: 0.18,
  /** Largest step `tick` will simulate at once; larger frames are clamped, not caught up. */
  maxStep: 1,
  sunrise: 0.25,
  sunset: 0.77,
  /** How far sunrise and sunset move toward noon by deep winter (fractions of a day). */
  sunriseDrift: 0.06,
  sunsetDrift: 0.09,
  /** Half-width of dawn and dusk around sunrise and sunset. */
  twilight: 0.03,
};

export const SEASON = {
  startCold: 0.1,
  /** Day on which cold reaches 1 and stays there. */
  deepWinterDay: 12,
  /** Cold at which chapter IV opens with the first snow. */
  strettoCold: 0.55,
  codaDay: 13,
  /** Dawn of this day is the thaw. */
  thawDay: 17,
  /** After the thaw (for a player who keeps going), cold eases to this over this many
   *  days, quickest at first, so the snow is visibly going on the first day of spring. */
  springCold: 0.15,
  springDays: 2,
  /** Share of forage lost to the season at full cold. */
  scarcity: 0.75,
  /** Cold at which the garden dies. */
  frostCold: 0.7,
};

export const WEATHER = {
  spellSeconds: [45, 110],
  intensity: [0.35, 1],
  wind: [0.05, 0.9],
  openingSpell: 50,
};

export const FIRE = {
  startFuel: 0.9,
  /** Fuel (in pieces of wood) at which the fire is at full intensity. */
  fullFuel: 6,
  maxFuel: 8,
  /** Wood burned per second at intensity (1 - idleDraw). */
  burn: 0.025,
  /** A fire consumes this much of its base rate even as embers. */
  idleDraw: 0.4,
  /** Extra draw at full wind. */
  windDraw: 0.5,
  /** Extra draw at full cold: frozen wood gives less heat for its weight. */
  coldDraw: 0.9,
  /** Shelter never cancels more than this share of rain and snow. */
  maxShelter: 0.8,
  /** A fire keeper holds intensity at tendFloor, rising by tendWinter at full cold. */
  tendFloor: 0.55,
  tendWinter: 0.35,
  /** Upper intensity bound (exclusive) of each named state of a lit fire. */
  bands: [
    ['embers', 0.2],
    ['low', 0.4],
    ['burning', 0.75],
    ['roaring', Infinity],
  ],
  /** How long the player is shown tending after touching the fire. */
  tendingSeconds: 2.5,
};

export const VITALS = {
  start: { warmth: 0.45, food: 0.7, water: 0.6, health: 1 },
  foodDrain: 1 / 350,
  waterDrain: 1 / 270,
  /** Share of the gap to the comfort level closed each second. */
  warmthRate: 0.02,
  ambientBase: 0.55,
  coldChill: 0.7,
  nightChill: 0.15,
  fireWarmth: 0.7,
  /** Walking keeps the blood moving: warmth settles here while on an expedition. */
  awayWarmth: 0.5,
  freezeBelow: 0.15,
  /** Health lost per second at warmth 0; scales down linearly to nothing at freezeBelow. */
  freezeHarm: 1 / 90,
  starveHarm: 1 / 160,
  thirstHarm: 1 / 110,
  /** Health mends only while warmth, food and water are all above this. */
  mendAbove: 0.4,
  mendRate: 1 / 480,
  revealBelow: 0.75,
  /** Below this health the player learns to rest. */
  restBelow: 0.9,
  warnBelow: 0.4,
  dangerBelow: 0.2,
  /** Seconds between repeated warnings about the same vital. */
  warningGap: 75,
};

export const PEOPLE = {
  /** One stranger can sleep by the open fire; everyone after needs a roof. */
  baseBeds: 1,
  /** Each survivor needs one meal and one drink per this many seconds. */
  upkeepSeconds: 90,
  foragePerMeal: 2,
  mend: 0.08,
  hungerHarm: 0.18,
  thirstHarm: 0.22,
  coldHarm: 0.12,
  /** Camp comfort below which survivors suffer from the cold. */
  coldBelow: 0.2,
  sickBelow: 0.4,
  wellAbove: 0.6,
  /** At dawn, anyone weaker than this may walk out. */
  leaveBelow: 0.25,
  leaveChance: 0.4,
  complaintGap: 60,
  /** Seconds in camp before a hard worker or a shirker is found out (varies per person). */
  noticeAfter: [150, 330],
  /** Seconds between a thief's chances to steal, and how much they take at once. */
  theftGap: [130, 240],
  stealAmount: [1, 3],
  /** Chance a thief acts when the chance comes: boldest while the player is away. */
  stealAway: 0.85,
  stealHome: 0.4,
  /** A thief who was let off steals this much less often. */
  forgivenRestraint: 0.5,
  /** Chance of catching a thief in the act at the fire, rising with every theft. */
  caughtChance: 0.3,
  caughtPerTheft: 0.2,
  /** Chance a thief takes food on the way out: leaving on their own, or driven out. */
  madeOff: 0.8,
  exiledMadeOff: 0.4,
  madeOffAmount: [2, 5],
};

export const THREAT = {
  fromChapter: 2,
  /** At or above this intensity the fire alone keeps the dark back. */
  safeFire: 0.5,
  /** Build per second on any night at full cold, however bright the fire. */
  drift: 0.006,
  /** Build per second with no fire at all. */
  darkRise: 0.012,
  dayFade: 0.004,
  brightFade: 0.001,
  brightFire: 0.75,
  /** Each guard divides the build by a further (guardPower × watch bonus). */
  guardPower: 0.6,
};

export const DIRECTOR = {
  /** Earliest moment the first stranger can reach the fire. */
  strangerAt: 280,
  arrivalGap: [60, 110],
  /** Newcomers only find a fire that is at least this bright. */
  arrivalFire: 0.35,
  /** Seconds between notes that someone came by and found no bed. */
  turnedAwayGap: 240,
  /** How soon someone follows a signal that the fire is friendly. */
  summonDelay: 10,
  firstIncident: 420,
  incidentGap: [90, 160],
  /** Default seconds before the same incident may recur. */
  incidentRepeat: 720,
  ambientGap: [35, 70],
  voiceGap: [55, 110],
};

/** The travelling trader (systems/trade.js). */
export const TRADE = {
  /** The first visit, on day 3; then one every couple of days, by daylight only. */
  firstAt: 600,
  gap: [380, 620],
  chapter: 2,
  /** Deals laid out on each visit. */
  offers: 3,
  /** What each deal is worth, in armfuls of wood. */
  bundle: [6, 12],
  /** The trader's cut. Scaled up on hard and down on easy with the yields dial. */
  markup: 1.25,
  /** Rough worth of each good, in armfuls of wood. Dearer goods are offered a little more often. */
  worth: {
    wood: 1, tinder: 2, stone: 1.5, fiber: 1.5, hide: 4,
    water: 1, forage: 1.5, meat: 3, rations: 2.5,
    scrap: 4, cloth: 4, wire: 6, medicine: 9, batteries: 8, parts: 9,
  },
};

export const EXPEDITION = {
  /** Ordinary encounters per trip, before any memory scene. */
  encounters: 2,
  /** Real seconds of rest at the fire before the player can set out again. */
  restSeconds: 75,
};

export const ACTIONS = {
  craftSeconds: 3,
  buildSeconds: 5,
};

export const LOG_LIMIT = 200;

/** Actions performed before the log points out that tasks run side by side. */
export const PARALLEL_TIP_AFTER = 6;

/**
 * Difficulty settings, chosen at the start of a game. Each scales a few levers;
 * normal is 1 throughout.
 *   hunger   how fast you and your people get hungry and thirsty
 *   burn     how fast the fire eats wood
 *   weather  how hard rain and snow hit the fire and your warmth
 *   yields   how much food the woods give
 *   threat   how fast the dark builds at night
 *   rogues   how many newcomers turn out to be shirkers or thieves
 */
export const DIFFICULTY = {
  easy: {
    label: 'easy',
    hint: 'slower hunger, kinder weather, more honest strangers',
    hunger: 0.75, burn: 0.85, weather: 0.6, yields: 1.25, threat: 0.75, rogues: 0.5,
  },
  normal: {
    label: 'normal',
    hint: 'the winter as it comes',
    hunger: 1, burn: 1, weather: 1, yields: 1, threat: 1, rogues: 1,
  },
  hard: {
    label: 'hard',
    hint: 'lean woods, bitter weather, strangers you cannot trust',
    hunger: 1.4, burn: 1.3, weather: 1.4, yields: 0.65, threat: 1.3, rogues: 1.7,
  },
};
