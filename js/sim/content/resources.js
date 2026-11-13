import { indexById } from '../util.js';

/**
 * @typedef {object} ResourceDef
 * @property {string} id
 * @property {string} label
 * @property {string} group   id of a RESOURCE_GROUPS entry
 * @property {number|null} cap  base storage limit; structures and gear may raise it
 * @property {string} [source]  where it comes from, told when the player is short of it
 */

export const RESOURCE_GROUPS = [
  { id: 'stores', label: 'stores' },
  { id: 'food', label: 'food and water' },
  { id: 'salvage', label: 'salvage' },
  { id: 'gear', label: 'gear' },
];

/** Listed in display order. @type {ResourceDef[]} */
export const RESOURCES = [
  { id: 'wood', label: 'wood', group: 'stores', cap: 40, source: 'gather wood, or set a woodcutter' },
  { id: 'tinder', label: 'tinder', group: 'stores', cap: 8, source: 'turns up while gathering wood or searching the undergrowth' },
  { id: 'stone', label: 'stone', group: 'stores', cap: 20, source: 'turns up at the creek and in the undergrowth' },
  { id: 'fiber', label: 'cord', group: 'stores', cap: 20, source: 'search the undergrowth, or set a forager; trips out find more' },
  { id: 'hide', label: 'hide', group: 'stores', cap: 10, source: 'snares and hunting' },

  { id: 'water', label: 'water', group: 'food', cap: 8, source: 'fetch water, or set a water carrier' },
  { id: 'forage', label: 'forage', group: 'food', cap: 15, source: 'search the undergrowth, or set a forager' },
  { id: 'meat', label: 'raw meat', group: 'food', cap: 10, source: 'snares and hunting' },
  { id: 'rations', label: 'rations', group: 'food', cap: 20, source: 'cook meat, or set a cook' },

  { id: 'scrap', label: 'scrap', group: 'salvage', cap: null, source: 'found on trips out' },
  { id: 'cloth', label: 'cloth', group: 'salvage', cap: null, source: 'found on trips out' },
  { id: 'wire', label: 'wire', group: 'salvage', cap: null, source: 'found on trips out' },
  { id: 'medicine', label: 'medicine', group: 'salvage', cap: null, source: 'found on trips out' },
  { id: 'batteries', label: 'batteries', group: 'salvage', cap: null, source: 'found on trips out' },
  { id: 'parts', label: 'radio parts', group: 'salvage', cap: null, source: 'found on trips out' },

  // Work tools: one is enough for your own hands; each worker in the matching job uses one more.
  { id: 'axe', label: 'stone axe', group: 'gear', cap: 4 },
  { id: 'knife', label: 'knife', group: 'gear', cap: 4 },
  { id: 'spear', label: 'spear', group: 'gear', cap: 3 },
  { id: 'waterskin', label: 'water skin', group: 'gear', cap: 4 },
  { id: 'pack', label: 'pack', group: 'gear', cap: 1 },
  { id: 'coat', label: 'hide coat', group: 'gear', cap: 1 },
  { id: 'torch', label: 'torch', group: 'gear', cap: 3 },
];

export const RESOURCE_BY_ID = indexById(RESOURCES);
export const RESOURCE_GROUP_BY_ID = indexById(RESOURCE_GROUPS);
