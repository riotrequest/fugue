/**
 * localStorage persistence. Every call is guarded: private windows and
 * blocked storage must never stop the game from running.
 */

const SAVE_KEY = 'fugue.save';
const SETTINGS_KEY = 'fugue.settings';
const HELP_KEY = 'fugue.help';

function read(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** @returns {boolean} whether it was stored */
function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    // Storage full or unavailable: play continues, it just won't persist.
    return false;
  }
}

/** @returns {object|null} */
export const loadSave = () => read(SAVE_KEY);

/** @param {object} save @returns {boolean} */
export const writeSave = (save) => write(SAVE_KEY, save);

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}

/** Ids of guide sections the player has already seen. @returns {string[]} */
export function loadHelpSeen() {
  const seen = read(HELP_KEY);
  return Array.isArray(seen) ? seen.filter((id) => typeof id === 'string') : [];
}

/** @param {string[]} ids */
export const writeHelpSeen = (ids) => write(HELP_KEY, ids);

/** @returns {{ muted: boolean, difficulty: string }} the last difficulty picked is offered again */
export const loadSettings = () => ({ muted: false, difficulty: 'normal', ...read(SETTINGS_KEY) });

/** @param {{ muted: boolean, difficulty: string }} settings */
export const writeSettings = (settings) => write(SETTINGS_KEY, settings);
