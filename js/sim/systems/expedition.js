import { EXPEDITION, TIME } from '../tuning.js';
import { fill } from '../util.js';
import { VENTURE_COOLDOWN } from '../content/actions.js';
import { EXPEDITION_LINES } from '../content/lines.js';
import { LOCATION_BY_ID } from '../content/locations.js';
import { RESOURCE_BY_ID } from '../content/resources.js';
import { add, bonus } from './camp.js';
import { meets } from './conditions.js';
import { log } from './journal.js';
import { openEvent } from './modal.js';

/**
 * Expeditions. Setting out queues a short chain of encounters, each a modal
 * event; what the player finds rides in a bag until the walk home. Only then
 * does camp time pass, all at once, with the fire left to whoever is tending it.
 *
 * @typedef {import('./journal.js').Sim} Sim
 */

/** Least recently met encounters first, in random order among equals. */
function drawEncounters(sim, location) {
  const { seen } = sim.state;
  return sim.rng
    .shuffle(location.encounters)
    .sort((a, b) => (seen[a] ?? -1) - (seen[b] ?? -1))
    .slice(0, EXPEDITION.encounters);
}

/** @param {Sim} sim @param {string} locationId */
export function setOut(sim, locationId) {
  const { state } = sim;
  const location = LOCATION_BY_ID[locationId];
  const scene = location.scenes.find(
    ({ memory, when }) => !state.memories.includes(memory) && meets(state, when),
  );

  state.expedition = {
    location: locationId,
    queue: [...drawEncounters(sim, location), ...(scene ? [scene.event] : [])],
    bag: {},
  };
  state.visits[locationId] = (state.visits[locationId] ?? 0) + 1;
  log(sim, location.depart);
  proceed(sim);
}

/** Puts a find in the bag. A pack lets more salvage be carried. */
export function stash(sim, id, count) {
  const { state, rng } = sim;
  const carried = RESOURCE_BY_ID[id].group === 'salvage' ? rng.round(count * (1 + bonus(state, 'haul'))) : count;
  state.expedition.bag[id] = (state.expedition.bag[id] ?? 0) + carried;
}

function describeBag(bag) {
  const items = Object.entries(bag).map(([id, count]) => `${count} ${RESOURCE_BY_ID[id].label}`);
  return items.length > 0
    ? fill(EXPEDITION_LINES.carrying, { haul: items.join(', ') })
    : EXPEDITION_LINES.empty;
}

/** Opens the next encounter, or the walk home once the queue is empty. */
export function proceed(sim) {
  const { expedition } = sim.state;
  const next = expedition.queue.shift();
  if (next) openEvent(sim, next);
  else openEvent(sim, 'way-back', { haul: describeBag(expedition.bag) });
}

/**
 * Ends the expedition: the bag is unpacked, anything the place revealed is noted,
 * and the player owes the walk home in camp time (see simulation.js).
 */
export function comeHome(sim) {
  const { state } = sim;
  const { location: locationId, bag } = state.expedition;
  const location = LOCATION_BY_ID[locationId];

  for (const [id, count] of Object.entries(bag)) add(state, id, count);
  for (const find of location.finds ?? []) {
    if (state.flags[find.flag]) continue;
    state.flags[find.flag] = true;
    log(sim, find.log, 'good');
  }
  state.expedition = null;
  state.player.awayFor = location.days * TIME.daySeconds;
  state.cooldowns[VENTURE_COOLDOWN] = {
    until: state.elapsed + state.player.awayFor + EXPEDITION.restSeconds,
    total: EXPEDITION.restSeconds,
  };
}
