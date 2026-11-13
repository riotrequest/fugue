import { LOG_LIMIT } from '../tuning.js';
import { hashOf } from '../util.js';

/**
 * The context every system receives.
 *
 * @typedef {object} Sim
 * @property {import('../state.js').GameState} state
 * @property {import('../rng.js').Rng} rng
 * @property {(type: string, payload: object) => void} emit
 */

/**
 * Appends a line to the persistent log and announces it.
 * @param {Sim} sim
 * @param {string} text
 * @param {'normal'|'good'|'warn'|'danger'|'memory'|'voice'} [tone]
 */
export function log(sim, text, tone = 'normal') {
  const entry = { text, tone, day: sim.state.clock.day };
  sim.state.log.push(entry);
  if (sim.state.log.length > LOG_LIMIT) sim.state.log.splice(0, sim.state.log.length - LOG_LIMIT);
  sim.emit('log', { ...entry });
}

/**
 * Picks a line from a pool, never the one picked from that pool last time.
 * @param {Sim} sim
 * @param {string[]} lines
 */
export function vary(sim, lines) {
  if (lines.length === 1) return lines[0];
  const key = hashOf(lines[0]);
  const last = sim.state.lastLine[key];
  let index;
  if (last === undefined) {
    index = sim.rng.int(0, lines.length - 1);
  } else {
    index = sim.rng.int(0, lines.length - 2);
    if (index >= last) index++;
  }
  sim.state.lastLine[key] = index;
  return lines[index];
}

/**
 * True at most once per `gap` seconds for a given key; used to keep recurring
 * warnings and complaints from flooding the log.
 * @param {Sim} sim
 * @param {string} key
 * @param {number} gap
 */
export function due(sim, key, gap) {
  const { seen, elapsed } = sim.state;
  if (seen[key] !== undefined && elapsed - seen[key] < gap) return false;
  seen[key] = elapsed;
  return true;
}

export const sfx = (sim, name) => sim.emit('sfx', { name });
