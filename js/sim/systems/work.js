import { BUILDING_BY_ID } from '../content/buildings.js';
import { ROLES } from '../content/roles.js';
import { accrue, add, amount, bonus, canAfford, pay } from './camp.js';
import { meets } from './conditions.js';
import { tend } from './fire.js';
import { phaseOf } from './time.js';
import { fill } from '../util.js';
import { log } from './journal.js';
import { catchGame, rollYields } from './yields.js';
import { paceOf, tally } from './people.js';

/**
 * Labour: what assigned survivors and productive structures bring in over time.
 * Work accumulates fractionally and is paid out one whole turn at a time.
 */

/**
 * One completed turn of a role, performed by `worker`. Tools are one per
 * worker, so with fewer tools than workers only that share of the work gets
 * the boost.
 */
function workTurn(sim, role, worker, workers) {
  const { state } = sim;
  const before = { ...state.resources };
  const toolShare = (id) => Math.min(1, amount(state, id) / workers);
  if (role.yields) rollYields(sim, role.yields, toolShare);
  if (role.game) {
    // Small catches pass quietly; a big one is worth a line.
    const animal = catchGame(sim, role.game, toolShare);
    if (animal?.worker) log(sim, fill(animal.worker, worker), 'good');
  }
  if (role.converts) {
    const recipe = role.converts.find(({ from, when }) => canAfford(state, from) && meets(state, when));
    if (recipe) {
      pay(state, recipe.from);
      for (const [id, count] of Object.entries(recipe.to)) add(state, id, count);
    }
  }
  if (role.tends) tend(sim, worker);
  for (const [id, count] of Object.entries(state.resources)) tally(state, id, count - (before[id] ?? 0));
}

export function stepWork(sim, dt) {
  const { state } = sim;
  const night = phaseOf(state) === 'night';

  for (const role of ROLES) {
    if (!role.period || (role.outdoors && night)) continue;
    const workers = state.people.filter((person) => person.role === role.id);
    if (workers.length === 0) continue;
    const pace = 1 + (role.hasten ? bonus(state, role.hasten) : 0);
    // A hard worker gets through more turns, a shirker fewer.
    const effort = workers.reduce((sum, person) => sum + paceOf(person), 0);
    const turns = accrue(state, role.id, (effort * pace * dt) / role.period);
    for (let i = 0; i < turns; i++) workTurn(sim, role, workers[i % workers.length], workers.length);
  }

  for (const id of state.built) {
    const { grows } = BUILDING_BY_ID[id];
    if (grows && meets(state, grows.when)) tally(state, grows.id, add(state, grows.id, accrue(state, id, dt / grows.period)));
  }
}
