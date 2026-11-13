import { PEOPLE } from '../tuning.js';
import { clamp01, fill } from '../util.js';
import { PEOPLE_LINES } from '../content/lines.js';
import { RESOURCE_BY_ID } from '../content/resources.js';
import { ROLE_BY_ID } from '../content/roles.js';
import { NAMES } from '../content/story.js';
import { MADE_OFF_LINES, THEFT_LINES, TRAITS, TRAIT_BY_ID } from '../content/traits.js';
import { accrue, amount, remove } from './camp.js';
import { meets } from './conditions.js';
import { dialOf } from './difficulty.js';
import { due, log, vary } from './journal.js';
import { openEvent } from './modal.js';
import { isAway } from './time.js';
import { comfortOf } from './vitals.js';

/**
 * The survivors: who is at the fire, what they are set to do, and what it costs
 * to keep them. Each needs a meal and a drink at regular intervals and a camp
 * that is not freezing; going without wears them down until they sicken, leave
 * or die. Each also has a hidden trait (content/traits.js): some work harder,
 * some hardly at all, and some help themselves to the stores.
 *
 * @typedef {import('../state.js').Person} Person
 * @typedef {import('./journal.js').Sim} Sim
 */

const say = (sim, pool, person, tone) => log(sim, fill(vary(sim, PEOPLE_LINES[pool]), person), tone);

/** Most workers a role can take right now: its own limit, and one each of a required tool. */
export function roomIn(state, role) {
  const room = Math.min(role.max ?? Infinity, role.tool?.required ? amount(state, role.tool.id) : Infinity);
  return room === Infinity ? null : room;
}

/** Saves from before traits existed: everyone there is steady. */
export const traitOf = (person) => TRAIT_BY_ID[person.trait] ?? TRAIT_BY_ID.steady;

/** How fast someone works, 1 being ordinary. */
export const paceOf = (person) => traitOf(person).pace;

/** What the camp knows someone to be, or '' while it does not. */
export const knownTraitOf = (person) => (person.noticed ? traitOf(person).label : '');

/** A nature for a newcomer. Harder settings bring more bad sorts. */
function rollTrait(sim) {
  const { rogues } = dialOf(sim.state);
  return sim.rng.weighted(TRAITS, (trait) => trait.weight * (trait.rogue ? rogues : 1)).id;
}

/** A name nobody at this fire has carried yet (reused only once all are spent). */
export function freshName(sim) {
  const unused = NAMES.filter((name) => !sim.state.namesUsed.includes(name));
  return sim.rng.pick(unused.length > 0 ? unused : NAMES);
}

/** @returns {Person} */
export function addPerson(sim, name, health = 1) {
  const { state, rng } = sim;
  const person = {
    id: state.nextPersonId++,
    name,
    seed: rng.int(1, 0x7fffffff),
    role: null,
    health,
    sick: health < PEOPLE.sickBelow,
    trait: rollTrait(sim),
    since: state.elapsed,
    noticed: false,
    thefts: 0,
  };
  state.people.push(person);
  state.namesUsed.push(name);
  state.flags.met = true;
  return person;
}

function removePerson(state, person) {
  state.people.splice(state.people.indexOf(person), 1);
}

/**
 * After a worker is lost (gone, dead or too sick to work), says which job now
 * goes short, so the change in the voices panel is never silent.
 * @param {string|null} roleId  the role they held
 */
function vacate(sim, roleId) {
  const role = ROLE_BY_ID[roleId];
  if (!role) return;
  const left = countIn(sim.state, roleId);
  log(sim, left === 0 ? role.vacant : `One fewer ${role.label}: ${left} left.`, 'warn');
}

/** Food a thief would go for, best first. */
const LOOT = ['rations', 'meat', 'forage', 'water'];

/** Up to `most` units of food from the stores, best first, as [id, count] pairs. Takes nothing. */
function lootFor(state, most) {
  const haul = [];
  let left = most;
  for (const id of LOOT) {
    const count = Math.min(left, Math.floor(amount(state, id)));
    if (count <= 0) continue;
    haul.push([id, count]);
    left -= count;
    if (left <= 0) break;
  }
  return haul;
}

/** "2 rations and 1 raw meat". */
function describeHaul(haul) {
  const parts = haul.map(([id, count]) => `${count} ${RESOURCE_BY_ID[id].label}`);
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : (parts[0] ?? '');
}

/** Takes the food out of the stores. @returns {string} what went, or '' if there was nothing */
function carryOff(state, haul) {
  for (const [id, count] of haul) remove(state, id, count);
  return describeHaul(haul);
}

/**
 * Someone walks out of the camp for good. A thief rarely goes empty-handed,
 * least of all when they are driven out.
 * @param {boolean} [exiled]  sent away rather than leaving of their own accord
 */
export function depart(sim, person, exiled = false) {
  const { state, rng } = sim;
  removePerson(state, person);
  const madeOff = traitOf(person).steals && rng.chance(exiled ? PEOPLE.exiledMadeOff : PEOPLE.madeOff);
  const took = madeOff ? carryOff(state, lootFor(state, rng.int(...PEOPLE.madeOffAmount))) : '';
  if (took) log(sim, fill(vary(sim, MADE_OFF_LINES), { name: person.name, took }), 'danger');
  else say(sim, exiled ? 'exiled' : 'left', person, 'warn');
  vacate(sim, person.role);
}

/** Let off with a warning: they steal less often after that. */
export function forgive(person) {
  person.forgiven = true;
}

/** It was hunger, not habit: they stop stealing for good. */
export function reform(person) {
  person.trait = 'steady';
  person.forgiven = true;
}

/** Applies a change in health, with whatever follows from it: sickness, recovery, death. */
export function changeHealth(sim, person, delta) {
  person.health = clamp01(person.health + delta);
  if (person.health <= 0) {
    removePerson(sim.state, person);
    say(sim, 'dead', person, 'danger');
    vacate(sim, person.role);
  } else if (!person.sick && person.health < PEOPLE.sickBelow) {
    const { role } = person;
    person.sick = true;
    person.role = null;
    say(sim, 'sick', person, 'warn');
    vacate(sim, role);
  } else if (person.sick && person.health >= PEOPLE.wellAbove) {
    person.sick = false;
    say(sim, 'well', person, 'good');
  }
}

export const countIn = (state, roleId) => state.people.filter((person) => person.role === roleId).length;

/**
 * Moves one survivor into (+1) or out of (-1) a role.
 * @returns {boolean} whether anything changed
 */
export function assign(sim, roleId, delta) {
  const { state } = sim;
  const role = ROLE_BY_ID[roleId];
  if (!role || !meets(state, role.when)) return false;

  if (delta === 1) {
    const room = roomIn(state, role);
    if (room !== null && countIn(state, roleId) >= room) return false;
    const idle = state.people.find((person) => person.role === null && !person.sick);
    if (!idle) return false;
    idle.role = roleId;
    return true;
  }
  if (delta === -1) {
    const worker = state.people.findLast((person) => person.role === roleId);
    if (!worker) return false;
    worker.role = null;
    return true;
  }
  return false;
}

/** The day's comings and goings, reported at dawn. */
const emptyLedger = () => ({ got: {}, meals: 0, drinks: 0 });

const ledgerOf = (state) => (state.ledger ??= emptyLedger());

/** Records what the camp's work brought in today. */
export function tally(state, id, count) {
  if (count <= 0) return;
  const { got } = ledgerOf(state);
  got[id] = (got[id] ?? 0) + count;
}

/** Takes one meal from the stores: cooked food first, then raw forage. */
function serveMeal(state) {
  for (const [id, count] of [['rations', 1], ['forage', PEOPLE.foragePerMeal]]) {
    if (amount(state, id) >= count) {
      remove(state, id, count);
      return true;
    }
  }
  return false;
}

function upkeep(sim, person) {
  const { state } = sim;
  const ledger = ledgerOf(state);
  const troubles = [];
  if (serveMeal(state)) ledger.meals += 1;
  else troubles.push(['hungry', PEOPLE.hungerHarm]);
  if (amount(state, 'water') >= 1) {
    remove(state, 'water', 1);
    ledger.drinks += 1;
  } else troubles.push(['thirsty', PEOPLE.thirstHarm]);
  if (comfortOf(state) < PEOPLE.coldBelow) troubles.push(['cold', PEOPLE.coldHarm]);

  if (troubles.length === 0) {
    changeHealth(sim, person, PEOPLE.mend);
    return;
  }
  const [worst] = troubles[0];
  // Raw meat feeds no one until it is cooked; say so, so the player knows a cook is missing.
  const uncooked = worst === 'hungry' && amount(state, 'meat') >= 1 && countIn(state, 'cook') === 0;
  if (due(sim, `complaint:${worst}`, PEOPLE.complaintGap)) say(sim, uncooked ? 'uncooked' : worst, person, 'warn');
  changeHealth(sim, person, -troubles.reduce((sum, [, harm]) => sum + harm, 0));
}

/** After a day or so the camp works out who pulls their weight and who does not. */
function noticing(sim) {
  const { state } = sim;
  if (isAway(state)) return;
  const [soonest, latest] = PEOPLE.noticeAfter;
  for (const person of state.people) {
    const trait = traitOf(person);
    if (person.noticed || !trait.noticed || person.sick) continue;
    const wait = soonest + (person.seed % (latest - soonest));
    if (state.elapsed - (person.since ?? 0) < wait) continue;
    person.noticed = true;
    log(sim, fill(vary(sim, trait.noticed), person), trait.tone);
  }
}

/**
 * Now and then a thief helps themselves to the food, most boldly while the
 * player is away. At the fire they may be caught in the act.
 */
function thieving(sim) {
  const { state, rng } = sim;
  if (state.elapsed < (state.timers.theft ?? 0)) return;
  state.timers.theft = state.elapsed + rng.range(...PEOPLE.theftGap);

  const thieves = state.people.filter((person) => traitOf(person).steals && !person.sick);
  if (thieves.length === 0) return;
  const thief = rng.pick(thieves);
  const away = isAway(state);
  const urge = (away ? PEOPLE.stealAway : PEOPLE.stealHome) * (thief.forgiven ? PEOPLE.forgivenRestraint : 1);
  if (!rng.chance(urge)) return;

  const haul = lootFor(state, rng.int(...PEOPLE.stealAmount));
  if (haul.length === 0) return;
  thief.thefts = (thief.thefts ?? 0) + 1;

  const watched = !away && !state.event && state.player.awake;
  if (watched && rng.chance(PEOPLE.caughtChance + PEOPLE.caughtPerTheft * (thief.thefts - 1))) {
    // Caught with it still in hand: the food stays, and the player decides what happens to them.
    thief.noticed = true;
    openEvent(sim, 'caught-stealing', { name: thief.name, person: thief.id, took: describeHaul(haul) });
    return;
  }
  log(sim, fill(vary(sim, THEFT_LINES), { took: carryOff(state, haul) }), 'warn');
}

export function stepPeople(sim, dt) {
  const { state } = sim;
  const { hunger } = dialOf(state);
  const turns = accrue(state, 'upkeep', (state.people.length * hunger * dt) / PEOPLE.upkeepSeconds);
  for (let i = 0; i < turns && state.people.length > 0; i++) {
    const index = state.upkeepTurn % state.people.length;
    state.upkeepTurn = index + 1;
    upkeep(sim, state.people[index]);
  }
  noticing(sim);
  thieving(sim);
}

/** Says at dawn what the camp brought in yesterday and what it ate, so the people's worth is plain. */
function report(sim) {
  const { state } = sim;
  const ledger = ledgerOf(state);
  state.ledger = emptyLedger();
  if (state.people.length === 0) return;
  const got = Object.entries(ledger.got).map(([id, count]) => `${RESOURCE_BY_ID[id].label} ${count}`);
  const brought = got.length > 0 ? `brought in ${got.join(' · ')}` : 'brought in nothing';
  const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;
  log(sim, `The camp’s day: ${brought}. ${plural(ledger.meals, 'meal')} and ${plural(ledger.drinks, 'drink')} handed out.`);
}

/** Dawn is when the camp takes stock, and when the weakest decide whether to stay. */
export function atDawn(sim) {
  report(sim);
  for (const person of sim.state.people.slice()) {
    if (person.health < PEOPLE.leaveBelow && sim.rng.chance(PEOPLE.leaveChance)) depart(sim, person);
  }
}

/**
 * How the renderer should draw someone right now.
 * @param {Person} person
 * @param {import('./time.js').Phase} phase
 * @returns {'sitting'|'sleeping'|'standing'|'working'|'away'}
 */
export function poseOf(person, phase) {
  if (person.sick) return 'sleeping';
  const role = ROLE_BY_ID[person.role];
  if (role?.guards) return 'standing';
  if (phase === 'night') return role?.outdoors || !role ? 'sleeping' : role.pose;
  return role ? role.pose : 'sitting';
}
