/**
 * Save files: a game carried out of the browser and back in. The file is the
 * same plain JSON the game keeps in localStorage, in a small labelled wrapper.
 * No DOM here, so it runs under Node too.
 */
import { restoreState } from './sim/state.js';

const FORMAT = 'fugue-save';

/** Anything bigger than this is not a save, whatever it claims. */
export const MAX_SAVE_BYTES = 5_000_000;

/** @param {object} save what `game.serialize()` returned @returns {string} */
export function encodeSaveFile(save, exported = new Date()) {
  return JSON.stringify({ format: FORMAT, exported: exported.toISOString(), save });
}

/**
 * Reads a save file back. Also accepts a bare save, as copied out of
 * localStorage by hand. Anything this version of the game could not play
 * (damaged, foreign, or from an older shape of the game) comes back as null.
 * @param {string} text
 * @returns {object|null}
 */
export function decodeSaveFile(text) {
  if (typeof text !== 'string' || text.length > MAX_SAVE_BYTES) return null;
  let data;
  try {
    data = JSON.parse(text.replace(/^﻿/, ''));
  } catch {
    return null;
  }
  const save = data?.format === FORMAT ? data.save : data;
  return restoreState(save);
}

/** `fugue-day-12-2026-11-14.json`: which day of the game, and when it was saved. */
export function saveFileName(save, exported = new Date()) {
  const day = Number.isInteger(save?.clock?.day) ? save.clock.day : 1;
  const pad = (n) => String(n).padStart(2, '0');
  const date = `${exported.getFullYear()}-${pad(exported.getMonth() + 1)}-${pad(exported.getDate())}`;
  return `fugue-day-${day}-${date}.json`;
}
