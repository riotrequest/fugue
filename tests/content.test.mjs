import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACTION_DEFS, ACTION_GROUPS } from '../js/sim/content/actions.js';
import { BUILDINGS } from '../js/sim/content/buildings.js';
import { ENDINGS, ENDING_BY_ID, DEATH_BY_HARM } from '../js/sim/content/endings.js';
import { GAME_GROUNDS } from '../js/sim/content/game.js';
import { ARRIVALS, EVENT_BY_ID, INCIDENTS } from '../js/sim/content/events.js';
import { AMBIENT_LINES, VOICE_LINES } from '../js/sim/content/lines.js';
import { LOCATIONS } from '../js/sim/content/locations.js';
import { MEMORIES, MEMORY_BY_ID } from '../js/sim/content/memories.js';
import { RECIPES } from '../js/sim/content/recipes.js';
import { RESOURCE_BY_ID, RESOURCE_GROUP_BY_ID, RESOURCES } from '../js/sim/content/resources.js';
import { ROLES } from '../js/sim/content/roles.js';
import { CHAPTERS, MILESTONES, NAMES } from '../js/sim/content/story.js';
import { WEATHERS, WEATHER_BY_ID } from '../js/sim/content/weather.js';
import { CONDITION_KEYS } from '../js/sim/systems/conditions.js';
import { EFFECT_NAMES } from '../js/sim/systems/effects.js';

/**
 * Content is data, so a typo in it is a bug nothing else will catch until a
 * player walks into it. These tests check every cross-reference in the tables.
 */

const EVENTS = Object.values(EVENT_BY_ID);
const STRUCTURE_IDS = [
  'leanto', 'rack', 'raincatcher', 'shed', 'snares', 'workbench', 'garden',
  'cabin', 'bunkhouse', 'palisade', 'smokehouse', 'watchtower', 'radio',
];

const isResource = (id) => id in RESOURCE_BY_ID;

function assertCost(cost = {}, where) {
  for (const [id, count] of Object.entries(cost)) {
    assert.ok(isResource(id), `${where}: unknown resource "${id}"`);
    assert.ok(Number.isInteger(count) && count > 0, `${where}: bad amount of ${id}`);
  }
}

function assertCondition(condition = {}, where) {
  for (const [key, arg] of Object.entries(condition)) {
    assert.ok(CONDITION_KEYS.includes(key), `${where}: unknown condition "${key}"`);
    if (key === 'built' || key === 'unbuilt') arg.forEach((id) => assert.ok(STRUCTURE_IDS.includes(id), `${where}: ${id}`));
    if (key === 'has') assertCost(arg, where);
    if (key === 'lacks' || key === 'known') arg.forEach((id) => assert.ok(isResource(id), `${where}: ${id}`));
    if (key === 'memories' || key === 'notMemories') arg.forEach((id) => assert.ok(id in MEMORY_BY_ID, `${where}: ${id}`));
    if (key === 'weather') arg.forEach((id) => assert.ok(id in WEATHER_BY_ID, `${where}: ${id}`));
  }
}

/** Checks a list of effects, following nested lists, and reports what it referenced. */
function assertEffects(effects, where, seen = { flags: new Set(), memories: new Set() }) {
  assert.ok(Array.isArray(effects), `${where}: effects must be a list`);
  for (const op of effects) {
    const [name] = Object.keys(op);
    assert.ok(EFFECT_NAMES.includes(name), `${where}: unknown effect "${name}"`);
    if (name === 'grant') Object.keys(op.grant).forEach((id) => assert.ok(isResource(id), `${where}: grant ${id}`));
    if (name === 'take') assertCost(op.take, where);
    if (name === 'yield') op.yield.forEach((line) => assert.ok(isResource(line.id), `${where}: yield ${line.id}`));
    if (name === 'vital') Object.keys(op.vital).forEach((id) => assert.ok(['warmth', 'food', 'water', 'health'].includes(id), `${where}: vital ${id}`));
    if (name === 'next') assert.ok(op.next in EVENT_BY_ID, `${where}: next ${op.next}`);
    if (name === 'end') assert.ok(op.end in ENDING_BY_ID, `${where}: end ${op.end}`);
    if (name === 'build') assert.ok(STRUCTURE_IDS.includes(op.build), `${where}: build ${op.build}`);
    if (name === 'weather') assert.ok(op.weather in WEATHER_BY_ID, `${where}: weather ${op.weather}`);
    if (name === 'venture') assert.ok(LOCATIONS.some((location) => location.id === op.venture), `${where}: ${op.venture}`);
    if (name === 'chapter') assert.ok(op.chapter >= 2 && op.chapter <= CHAPTERS.length, `${where}: chapter`);
    if (name === 'flag') seen.flags.add(op.flag);
    if (name === 'memory') {
      assert.ok(op.memory in MEMORY_BY_ID, `${where}: memory ${op.memory}`);
      seen.memories.add(op.memory);
    }
    for (const nested of [op.then, op.pass, op.fail]) if (nested) assertEffects(nested, where, seen);
  }
  return seen;
}

test('ids are unique within every table', () => {
  const tables = { RESOURCES, RECIPES, BUILDINGS, ROLES, WEATHERS, MEMORIES, ENDINGS, LOCATIONS, MILESTONES, ACTION_DEFS };
  for (const [name, table] of Object.entries(tables)) {
    const ids = table.map((entry) => entry.id);
    assert.equal(new Set(ids).size, ids.length, `duplicate id in ${name}`);
  }
  const eventCount = ARRIVALS.length + INCIDENTS.length + LOCATIONS.flatMap((l) => [...l.encounters, ...l.scenes]).length;
  assert.ok(EVENTS.length > eventCount, 'no event id shadows another');
  assert.equal(new Set(NAMES).size, NAMES.length);
});

test('the structures are exactly the ones the renderer knows', () => {
  assert.deepEqual(BUILDINGS.map((building) => building.id).sort(), STRUCTURE_IDS.slice().sort());
});

test('resources, recipes, buildings and roles refer only to things that exist', () => {
  for (const resource of RESOURCES) assert.ok(resource.group in RESOURCE_GROUP_BY_ID, resource.id);
  for (const recipe of RECIPES) {
    assert.equal(RESOURCE_BY_ID[recipe.id]?.group, 'gear', `${recipe.id} is not gear`);
    assertCost(recipe.cost, recipe.id);
    assertCost(recipe.caps, recipe.id);
    (recipe.tools ?? []).forEach((id) => assert.ok(isResource(id), `${recipe.id}: tool ${id}`));
    assertCondition(recipe.when, recipe.id);
  }
  for (const building of BUILDINGS) {
    assertCost(building.cost, building.id);
    assertCost(building.caps, building.id);
    assertCondition(building.when, building.id);
    (building.gates ?? []).forEach((gate) => assertCondition(gate.when, building.id));
    if (building.grows) {
      assert.ok(isResource(building.grows.id));
      assertCondition(building.grows.when, building.id);
    }
  }
  for (const role of ROLES) {
    assertCondition(role.when, role.id);
    (role.yields ?? []).forEach((line) => assert.ok(isResource(line.id), `${role.id}: ${line.id}`));
    for (const { from, to } of role.converts ?? []) {
      assertCost(from, role.id);
      assertCost(to, role.id);
    }
    assert.ok(role.period > 0 || role.guards, `${role.id} does nothing`);
  }
  for (const weather of WEATHERS) assertCondition(weather.when, weather.id);
});

test('game grounds are well formed and every snare or hunt draws on one', () => {
  for (const [id, ground] of Object.entries(GAME_GROUNDS)) {
    assert.ok(ground.empty.length > 0, `${id}: nothing to say when empty`);
    assert.ok(ground.catches.length > 0, `${id}: nothing to catch`);
    for (const animal of ground.catches) {
      assert.ok(animal.weight > 0 && animal.lines.length > 0, `${id}/${animal.id}`);
      for (const line of animal.yields) {
        assert.ok(isResource(line.id), `${id}/${animal.id}: ${line.id}`);
        assert.equal(line.scarce, undefined, `${id}/${animal.id}: the ground handles scarcity`);
      }
    }
  }
  const grounds = [
    ...ROLES.map((role) => role.game),
    ...ACTION_DEFS.flatMap((def) => (def.effects ?? []).map((op) => op.game)),
  ].filter(Boolean);
  assert.ok(grounds.length >= 4);
  for (const id of grounds) assert.ok(id in GAME_GROUNDS, `unknown game ground ${id}`);
});

test('every building and recipe costs no more than the camp can store when it unlocks', () => {
  const byId = Object.fromEntries(BUILDINGS.map((building) => [building.id, building]));
  /** Every structure that must stand before this plan appears, followed back through its own prerequisites. */
  const prerequisites = (when, found = new Set()) => {
    for (const id of when?.built ?? []) {
      if (found.has(id)) continue;
      found.add(id);
      prerequisites(byId[id].when, found);
    }
    return found;
  };

  for (const item of [...BUILDINGS, ...RECIPES]) {
    const standing = [...prerequisites(item.when)].map((id) => byId[id]);
    for (const [id, count] of Object.entries(item.cost ?? {})) {
      const base = RESOURCE_BY_ID[id].cap;
      if (base === null) continue;
      const cap = base + standing.reduce((sum, building) => sum + (building.caps?.[id] ?? 0), 0);
      assert.ok(count <= cap, `${item.id} costs ${count} ${id} but only ${cap} can be stored when it unlocks`);
    }
  }
});

test('every action is well formed', () => {
  const groups = ACTION_GROUPS.map((group) => group.id);
  for (const action of ACTION_DEFS) {
    assert.ok(groups.includes(action.group), `${action.id}: group`);
    assert.ok(action.label && action.hint, `${action.id}: label and hint`);
    assertCost(action.cost, action.id);
    (action.tools ?? []).forEach((id) => assert.ok(isResource(id), `${action.id}: tool ${id}`));
    if (action.fills) assert.ok(isResource(action.fills), `${action.id}: fills`);
    assertCondition(action.when, action.id);
    (action.gates ?? []).forEach((gate) => assertCondition(gate.when, action.id));
    assertEffects(action.effects, action.id);
  }
});

test('every event is well formed and always has a way out', () => {
  for (const event of EVENTS) {
    assertCondition(event.when, event.id);
    assert.ok(event.choices.length > 0, `${event.id}: no choices`);
    assert.equal(new Set(event.choices.map((choice) => choice.id)).size, event.choices.length, `${event.id}: duplicate choice`);
    assert.ok(
      event.choices.some((choice) => !choice.cost && !choice.tools && !choice.when),
      `${event.id}: every choice can be blocked`,
    );
    for (const choice of event.choices) {
      const where = `${event.id}/${choice.id}`;
      assert.ok(choice.label, where);
      assertCost(choice.cost, where);
      (choice.tools ?? []).forEach((id) => assert.ok(isResource(id), `${where}: tool ${id}`));
      assertCondition(choice.when, where);
      assertEffects(choice.effects, where);
    }
    const usesName = JSON.stringify(event).includes('{name}');
    if (usesName && !event.cast) {
      const chained = EVENTS.some((other) => other.cast && JSON.stringify(other).includes(`"next":"${event.id}"`));
      assert.ok(chained, `${event.id} speaks of {name} but casts no one`);
    }
  }
  for (const event of ARRIVALS) assert.equal(event.cast, 'newcomer', event.id);
});

test('locations draw on real events and every memory can be found', () => {
  const found = new Set();
  const collect = (effects, where) => assertEffects(effects, where).memories.forEach((id) => found.add(id));

  for (const location of LOCATIONS) {
    assertCost(location.cost, location.id);
    assert.ok(location.days > 0 && location.days < 1, location.id);
    for (const id of location.encounters) assert.ok(id in EVENT_BY_ID, `${location.id}: ${id}`);
    for (const scene of location.scenes) {
      const event = EVENT_BY_ID[scene.event];
      assert.ok(event, `${location.id}: ${scene.event}`);
      assert.ok(
        event.choices.every((choice) => JSON.stringify(choice.effects).includes(`"memory":"${scene.memory}"`)),
        `${scene.event} must always yield ${scene.memory}`,
      );
    }
  }
  for (const event of EVENTS) event.choices.forEach((choice) => collect(choice.effects, event.id));
  assert.deepEqual([...found].sort(), MEMORIES.map((memory) => memory.id).sort());
});

test('flags that gate content are set somewhere', () => {
  const set = new Set(['met', 'hurt']);
  const note = (effects, where) => assertEffects(effects, where).flags.forEach((flag) => set.add(flag));
  for (const milestone of MILESTONES) {
    assertCondition(milestone.when, milestone.id);
    note(milestone.effects, milestone.id);
  }
  for (const action of ACTION_DEFS) note(action.effects, action.id);
  for (const event of EVENTS) event.choices.forEach((choice) => note(choice.effects, event.id));
  for (const location of LOCATIONS) (location.finds ?? []).forEach((find) => set.add(find.flag));

  const wanted = new Set();
  const want = (condition = {}) => [...(condition.flags ?? []), ...(condition.notFlags ?? [])].forEach((flag) => wanted.add(flag));
  for (const entry of [...ACTION_DEFS, ...EVENTS, ...MILESTONES, ...ROLES, ...AMBIENT_LINES, ...VOICE_LINES]) want(entry.when);
  for (const flag of wanted) assert.ok(set.has(flag), `nothing ever sets the flag "${flag}"`);
  for (const location of LOCATIONS) assert.ok(set.has(`loc-${location.id}`), `${location.id} can never be discovered`);
});

test('endings cover every way to die and always have a text', () => {
  for (const ending of ENDINGS) {
    assert.ok(ending.title, ending.id);
    ending.variants.forEach((variant) => assertCondition(variant.when, ending.id));
    assert.equal(ending.variants.at(-1).when, undefined, `${ending.id}: last variant must be unconditional`);
  }
  for (const id of Object.values(DEATH_BY_HARM)) assert.equal(ENDING_BY_ID[id]?.death, true, id);
  assert.ok(ENDINGS.filter((ending) => !ending.death).length >= 3);
});

test('line pools are usable in any circumstances', () => {
  for (const pools of [AMBIENT_LINES, VOICE_LINES]) {
    assert.ok(pools.some((pool) => Object.keys(pool.when).length === 0), 'one pool must always apply');
    for (const pool of pools) {
      assertCondition(pool.when, 'line pool');
      assert.ok(pool.lines.length > 0);
    }
  }
});
