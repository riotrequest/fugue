import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../js/sim/index.js';
import { createRng } from '../js/sim/rng.js';
import { createState, restoreState } from '../js/sim/state.js';
import { DIRECTOR, TRUST } from '../js/sim/tuning.js';
import { AIMS } from '../js/sim/content/aims.js';
import { BUILDINGS, BUILDING_BY_ID } from '../js/sim/content/buildings.js';
import { CHAINS, CHAIN_BY_ID, CHAIN_EVENTS } from '../js/sim/content/chains.js';
import { DECISIONS } from '../js/sim/content/decisions.js';
import { EVENT_BY_ID } from '../js/sim/content/events.js';
import { LOCATIONS } from '../js/sim/content/locations.js';
import { MOMENTS } from '../js/sim/content/moments.js';
import { PROJECTS } from '../js/sim/content/research.js';
import { ROLE_BY_ID } from '../js/sim/content/roles.js';
import { WEATHER_BY_ID } from '../js/sim/content/weather.js';
import { bonus, paceBonus } from '../js/sim/systems/camp.js';
import { endChain, scheduleChain, startChain, stepChains } from '../js/sim/systems/chains.js';
import { CONDITION_KEYS, meets } from '../js/sim/systems/conditions.js';
import { applyEffects, EFFECT_NAMES } from '../js/sim/systems/effects.js';
import { choose } from '../js/sim/systems/events.js';
import { castable, castFor } from '../js/sim/systems/modal.js';
import { addPerson, adjustTrust, changeHealth, depart, paceOf, rejoin, setBond, trustLabelOf, trustOf } from '../js/sim/systems/people.js';
import { insight, researchPace, stepResearch, study } from '../js/sim/systems/research.js';
import { seasonIdOf, yearOf } from '../js/sim/systems/time.js';
import { playthrough } from './helpers/bot.mjs';

/**
 * The Living World expansion: trust and bonds, small moments and long stories,
 * the notebook, the new buildings and places, and the turning year after the
 * thaw. Unit checks build a bare simulation; the end-to-end checks share one
 * long settler game that plays through to the second spring.
 */

/** A bare simulation around a fresh state, with emitted signals collected. */
function makeSim(seed = 11) {
  const state = createState(seed);
  state.player.awake = true;
  const signals = [];
  return { state, rng: createRng(state), emit: (name, data) => signals.push([name, data]), signals };
}

/** Someone settled at the fire long enough to be cast in anything. */
function settle(sim, name) {
  const person = addPerson(sim, name);
  person.since = -1000;
  return person;
}

let longGame = null;
/** One settler game, played on past the thaw to the second spring: shared, computed once. */
function long() {
  if (!longGame) {
    const endings = [];
    let firstSurvivor = null;
    const result = playthrough({
      seed: 21,
      minutes: 225,
      carryOn: true,
      onTick: (game, seconds) => {
        const { ended } = game.state;
        if (ended && endings.at(-1) !== ended.id) endings.push(ended.id);
        if (firstSurvivor === null && game.state.people.length > 0) firstSurvivor = seconds;
      },
    });
    longGame = { ...result, endings, firstSurvivor };
  }
  return longGame;
}

// ── 1. The roaring fire ───────────────────────────────────────────────

test('a fire kept roaring is seen from the ridge and brings the first stranger early', () => {
  const game = createGame({ seed: 4 });
  game.perform(game.actions()[0].id);
  let opened = null;
  for (let t = 0; t < DIRECTOR.strangerAt && opened === null; t += 0.5) {
    game.state.fire.fuel = 40;
    game.state.fire.lit = true;
    game.tick(0.5);
    if (game.state.event?.id === 'stranger') opened = game.state.elapsed;
    if (game.state.event && game.state.event.id !== 'stranger') game.choose(game.event().choices.find((c) => c.enabled).id);
  }
  assert.ok(opened !== null, 'the stranger came');
  assert.ok(opened < DIRECTOR.strangerAt, `came at ${opened}s, before the ordinary ${DIRECTOR.strangerAt}s`);
  assert.ok(game.log().some((entry) => entry.text.includes('throws its light a long way')), 'the camp noticed the light first');
});

// ── 2. Pacing ─────────────────────────────────────────────────────────

test('no unprompted card opens within the calm after another closes', () => {
  const { game } = playthrough({
    seed: 8,
    minutes: 50,
    onTick: (g) => {
      const { event, timers, expedition, elapsed } = g.state;
      if (!event || expedition) return;
      const def = EVENT_BY_ID[event.id];
      const unprompted = DECISIONS.includes(def) || CHAIN_EVENTS.includes(def);
      if (unprompted && g.state.seen[event.id] === elapsed) {
        assert.ok(elapsed >= (timers.calm ?? 0) - 1e-9, `${event.id} opened inside the calm`);
      }
    },
  });
  assert.ok(game.state.elapsed > 0);
});

// ── 3. Moments ────────────────────────────────────────────────────────

test('moments are well formed, quiet, and enough of them', () => {
  assert.ok(MOMENTS.length >= 20 && MOMENTS.length <= 30, `${MOMENTS.length} moments`);
  assert.equal(new Set(MOMENTS.map((m) => m.id)).size, MOMENTS.length);
  for (const moment of MOMENTS) {
    for (const key of Object.keys(moment.when ?? {})) assert.ok(CONDITION_KEYS.includes(key), `${moment.id}: ${key}`);
    for (const op of moment.effects ?? []) {
      const [name] = Object.keys(op);
      assert.ok(EFFECT_NAMES.includes(name), `${moment.id}: ${name}`);
      // A moment never opens a card, ends the game, or takes someone away.
      assert.ok(!['next', 'end', 'depart', 'exile', 'memory', 'venture'].includes(name), `${moment.id}: ${name}`);
      if (name === 'person') assert.ok(op.person.health > 0, `${moment.id} must not harm`);
    }
    const texts = Array.isArray(moment.text) ? moment.text : [moment.text];
    const named = texts.some((text) => text.includes('{name}'));
    assert.ok(!named || moment.cast, `${moment.id} speaks of {name} but casts no one`);
  }
});

test('moments happen in a real game, in the log, without opening cards', () => {
  const { game } = long();
  const seen = Object.keys(game.state.seen).filter((key) => key.startsWith('moment:'));
  assert.ok(seen.length >= 12, `${seen.length} different moments`);
});

// ── 4. Decisions and casts ───────────────────────────────────────────

test('decision events are well formed and only drawn when their cast exists', () => {
  assert.ok(DECISIONS.length >= 15 && DECISIONS.length <= 20, `${DECISIONS.length} decisions`);
  const sim = makeSim();
  const alone = settle(sim, 'Ines');
  const rivalsOnly = DECISIONS.find((def) => def.cast === 'rivals');
  assert.equal(castable(sim.state, rivalsOnly), false, 'no rivals, no fight');
  const other = settle(sim, 'Bram');
  setBond(alone, other, 'rival');
  assert.equal(castable(sim.state, rivalsOnly), true);
  const cast = castFor(sim, rivalsOnly);
  assert.deepEqual([cast.person, cast.otherId].sort(), [alone.id, other.id].sort());
  assert.ok(cast.name && cast.other);
});

test('a decision can change trust and bonds, aimed at the cast and the other', () => {
  const sim = makeSim();
  const a = settle(sim, 'Ines');
  const b = settle(sim, 'Bram');
  const ctx = { name: a.name, person: a.id, other: b.name, otherId: b.id };
  applyEffects(sim, [{ trust: { who: 'cast', delta: 0.2 } }, { trust: { who: 'other', delta: -0.2 } }, { bond: 'friend' }], ctx);
  assert.ok(trustOf(a) > TRUST.start && trustOf(b) < TRUST.start);
  assert.equal(a.bonds[b.id], 'friend');
  assert.equal(b.bonds[a.id], 'friend');
});

// ── 5. Story chains ──────────────────────────────────────────────────

test('chains: every stage continues or ends, every stage exists, and the casts match', () => {
  const world = CHAINS.filter((def) => !def.arc);
  const arcs = CHAINS.filter((def) => def.arc);
  assert.ok(world.length >= 8 && world.length <= 12, `${world.length} world chains`);
  assert.ok(arcs.length >= 5, `${arcs.length} personal arcs`);
  const ids = new Set(CHAINS.map((def) => def.id));
  const stagesOf = (effects) => effects.flatMap((op) => [
    ...(op.chain ? [op.chain] : []),
    ...['pass', 'fail', 'then'].flatMap((key) => (op[key] ? stagesOf(op[key]) : [])),
  ]);
  const closes = (effects) => effects.some((op) => op.chain || op.chainEnd || op.next || (op.roll && closes(op.pass ?? []) && closes(op.fail ?? [])));
  for (const def of CHAINS) {
    const start = EVENT_BY_ID[def.start];
    assert.ok(start, `${def.id}: start ${def.start}`);
    assert.equal(start.cast, def.cast, `${def.id}: the opening event casts as the chain does`);
  }
  for (const event of CHAIN_EVENTS) {
    for (const choice of event.choices) {
      assert.ok(closes(choice.effects), `${event.id}/${choice.id} leaves its story hanging`);
      for (const op of stagesOf(choice.effects)) {
        assert.ok(ids.has(op.id), `${event.id}: chain ${op.id}`);
        assert.ok(EVENT_BY_ID[op.stage], `${event.id}: stage ${op.stage}`);
      }
      for (const op of choice.effects.filter((o) => o.chainEnd)) assert.ok(ids.has(op.chainEnd), `${event.id}: ${op.chainEnd}`);
    }
  }
});

test('a chain waits between stages, then opens its next one with the same cast', () => {
  const sim = makeSim();
  const person = settle(sim, 'Ines');
  scheduleChain(sim, { id: 'letter', stage: 'letter-2', wait: [100, 100] }, { name: person.name, person: person.id });
  assert.equal(stepChains(sim), false, 'not yet');
  sim.state.elapsed += 101;
  assert.equal(stepChains(sim), true);
  assert.equal(sim.state.event.id, 'letter-2');
  assert.equal(sim.state.event.ctx.person, person.id);
  assert.equal(sim.state.event.ctx.chain, 'letter');
});

test('a chain whose person has gone ends with its lost line', () => {
  const sim = makeSim();
  const person = settle(sim, 'Ines');
  scheduleChain(sim, { id: 'letter', stage: 'letter-2', wait: [10, 10] }, { name: person.name, person: person.id });
  depart(sim, person);
  sim.state.elapsed += 20;
  assert.equal(stepChains(sim), false);
  assert.equal(sim.state.chains.letter.done, true);
  assert.ok(sim.state.log.some((entry) => entry.text.includes('letter')), 'the loss is told');
});

test('an errand left too long lapses, and the one who asked trusts you less', () => {
  const sim = makeSim();
  const person = settle(sim, 'Ines');
  scheduleChain(sim, { id: 'ring', stage: 'ring-2', wait: [1, 1] }, { name: person.name, person: person.id });
  const before = trustOf(person);
  for (let i = 0; i < 100 && !sim.state.chains.ring.done; i++) {
    sim.state.elapsed += 30;
    stepChains(sim);
  }
  assert.equal(sim.state.chains.ring.done, true);
  assert.ok(trustOf(person) < before);
});

test('starting a personal arc gives the survivor a story note, and ending it keeps it', () => {
  const sim = makeSim();
  sim.state.elapsed = DIRECTOR.firstChain + 1;
  for (const name of ['Ines', 'Bram', 'Dov', 'Willa']) settle(sim, name);
  sim.state.flags['loc-suburb'] = true;
  let started = 0;
  for (let i = 0; i < 40 && started < 1; i++) {
    if (startChain(sim)) {
      const id = sim.state.event.ctx.chain;
      if (CHAIN_BY_ID[id].arc) {
        started += 1;
        const person = sim.state.people.find((p) => p.id === sim.state.event.ctx.person);
        assert.equal(person.arc, id);
        endChain(sim, id, sim.state.event.ctx);
        assert.equal(person.arc, `done:${id}`);
      }
    }
    sim.state.event = null;
    sim.state.timers.chain = 0;
    sim.state.chains = {};
  }
  assert.equal(started, 1);
});

test('stories unfold over a long game', () => {
  const { game } = long();
  const done = Object.entries(game.state.chains).filter(([, entry]) => entry.done);
  assert.ok(done.length >= 8, `${done.length} chains told`);
  assert.ok(done.some(([id]) => CHAIN_BY_ID[id].arc), 'at least one personal arc');
});

// ── 6. Trust ──────────────────────────────────────────────────────────

test('trust: labels, limits, and the loyal working harder', () => {
  const sim = makeSim();
  const person = settle(sim, 'Ines');
  assert.equal(trustLabelOf(person), 'steady');
  adjustTrust(person, 5);
  assert.equal(trustOf(person), 1);
  assert.equal(trustLabelOf(person), 'devoted');
  const loyalPace = paceOf(person);
  adjustTrust(person, -0.8);
  assert.equal(trustLabelOf(person), 'wary');
  assert.ok(loyalPace > paceOf(person));
  adjustTrust(person, -5);
  assert.equal(trustOf(person), 0);
  assert.equal(trustLabelOf(person), 'bitter');
});

test('a fed camp comes to trust you; a hungry one stops', () => {
  const fed = createGame({ seed: 2 });
  const hungry = createGame({ seed: 2 });
  for (const game of [fed, hungry]) {
    game.perform(game.actions()[0].id);
    addPerson({ state: game.state, rng: createRng(game.state), emit() {} }, 'Ines').since = 0;
  }
  for (let t = 0; t < 600; t += 1) {
    Object.assign(fed.state.resources, { rations: 20, water: 8 });
    Object.assign(hungry.state.resources, { rations: 0, forage: 0, water: 8 });
    for (const game of [fed, hungry]) {
      game.state.fire.fuel = 30;
      game.state.fire.lit = true;
      game.state.event = null;
      game.tick(1);
    }
  }
  const trustIn = (game) => game.state.people[0]?.trust ?? 0;
  assert.ok(trustIn(fed) > TRUST.start, `fed: ${trustIn(fed)}`);
  assert.ok(trustIn(hungry) < TRUST.start, `hungry: ${trustIn(hungry)}`);
});

// ── 7. Bonds and grief ───────────────────────────────────────────────

test('bonds are mutual, and a death is felt by those who were close', () => {
  const sim = makeSim();
  const a = settle(sim, 'Ines');
  const b = settle(sim, 'Bram');
  setBond(a, b, 'partner');
  assert.equal(b.bonds[a.id], 'partner');
  const trustBefore = trustOf(b);
  const healthBefore = b.health;
  changeHealth(sim, a, -5, 'cold');
  assert.ok(!sim.state.people.includes(a));
  assert.equal(b.bonds[a.id], undefined, 'the bond goes with them');
  assert.ok(trustOf(b) < trustBefore && b.health < healthBefore, 'grief');
  assert.equal(sim.state.history.dead[0].cause, 'cold');
  setBond(b, b, 'friend');
  assert.deepEqual(b.bonds, {}, 'no one bonds with themselves');
});

test('a cairn for the dead softens grief', () => {
  const plain = makeSim(3);
  const eased = makeSim(3);
  eased.state.built.push('cairn');
  const losses = [plain, eased].map((sim) => {
    const a = settle(sim, 'Ines');
    const b = settle(sim, 'Bram');
    setBond(a, b, 'friend');
    depart(sim, a, true);
    return TRUST.start - trustOf(b);
  });
  assert.ok(losses[1] < losses[0], `${losses}`);
});

// ── 8. History and returning ─────────────────────────────────────────

test('those who walk out are remembered, and may come back after a while', () => {
  const sim = makeSim();
  const person = settle(sim, 'Ines');
  settle(sim, 'Bram');
  depart(sim, person);
  const def = EVENT_BY_ID['arrival-return'];
  assert.equal(castable(sim.state, def), false, 'not the same day');
  sim.state.clock.day += 3;
  assert.equal(castable(sim.state, def), true);
  const back = rejoin(sim, person.id);
  assert.equal(back.name, 'Ines');
  assert.ok(sim.state.people.includes(back));
  assert.equal(castable(sim.state, def), false, 'they only come back once');
  assert.ok(sim.state.history.records.some((record) => record.text.includes('came back')));
});

test('the exiled are remembered but never come back', () => {
  const sim = makeSim();
  const person = settle(sim, 'Ines');
  settle(sim, 'Bram');
  depart(sim, person, true);
  sim.state.clock.day += 5;
  assert.equal(castable(sim.state, EVENT_BY_ID['arrival-return']), false);
  assert.equal(sim.state.history.gone[0].exiled, true);
});

// ── 9. Survivor view ─────────────────────────────────────────────────

test('the survivor card says who someone is, how far they trust you, and who they are close to', () => {
  const game = createGame({ seed: 5 });
  const sim = { state: game.state, rng: createRng(game.state), emit() {} };
  game.state.flags.met = true;
  const a = settle(sim, 'Ines');
  const b = settle(sim, 'Bram');
  setBond(a, b, 'friend');
  a.arc = 'letter';
  const [member] = game.people().members;
  assert.equal(member.name, 'Ines');
  assert.equal(member.trustLabel, 'steady');
  assert.deepEqual(member.bonds, [{ name: 'Bram', kind: 'friend', word: 'friend' }]);
  assert.match(member.story, /letter/);
  assert.equal(member.role, 'resting');
});

// ── 10. The notebook ─────────────────────────────────────────────────

test('the notebook: found, chosen, paid once, worked faster by scholars', () => {
  const sim = makeSim();
  assert.equal(study(sim, 'felling'), false, 'no notebook yet');
  sim.state.flags.notebook = true;
  assert.equal(study(sim, 'field-medicine'), false, 'needs herb lore first');
  assert.equal(study(sim, 'felling'), true);
  const alone = researchPace(sim.state);
  for (const name of ['Ines', 'Bram', 'Dov']) settle(sim, name);
  sim.state.people[0].role = 'scholar';
  sim.state.clock.time = 0.5;
  assert.ok(researchPace(sim.state) > alone, 'a scholar helps by day');
  insight(sim.state, 50);
  for (let i = 0; i < 400 && !sim.state.research.done.includes('felling'); i++) stepResearch(sim, 1);
  assert.ok(sim.state.research.done.includes('felling'));
  assert.equal(sim.state.research.active, null);
  assert.ok(paceBonus(sim.state, 'woodcutter') > 0, 'the bonus applies');
  assert.ok(sim.signals.some(([name]) => name === 'research'));
});

test('notebook projects are well formed and open real things', () => {
  assert.ok(PROJECTS.length >= 8 && PROJECTS.length <= 12, `${PROJECTS.length} projects`);
  const ids = new Set(PROJECTS.map((p) => p.id));
  for (const project of PROJECTS) {
    assert.ok(project.work > 0 && project.title && project.text && project.done, project.id);
    for (const need of project.needs ?? []) assert.ok(ids.has(need), `${project.id}: ${need}`);
    for (const key of Object.keys(project.when ?? {})) assert.ok(CONDITION_KEYS.includes(key), `${project.id}: ${key}`);
    for (const role of Object.keys(project.pace ?? {})) assert.ok(ROLE_BY_ID[role], `${project.id}: ${role}`);
  }
  // Every research gate names a real project.
  const gated = [...BUILDINGS.map((b) => b.when), ...Object.values(ROLE_BY_ID).map((r) => r.when)];
  for (const when of gated) for (const id of when?.researched ?? []) assert.ok(ids.has(id), id);
});

test('the notebook fills up over a long game', () => {
  const { game } = long();
  assert.ok(game.state.research.done.length >= 8, `${game.state.research.done.length} projects`);
});

// ── 11. Buildings ────────────────────────────────────────────────────

test('new buildings are gated, and do what they say', () => {
  const added = ['well', 'kiln', 'infirmary', 'coldframe', 'cellar', 'sauna', 'school', 'cairn'];
  for (const id of added) assert.ok(BUILDING_BY_ID[id], id);
  const sim = makeSim();
  assert.equal(meets(sim.state, BUILDING_BY_ID.well.when), false);
  sim.state.research.done.push('water-finding');
  assert.equal(meets(sim.state, BUILDING_BY_ID.well.when), true);
  sim.state.built.push('kiln', 'infirmary', 'school');
  assert.ok(bonus(sim.state, 'burn') > 0);
  assert.ok(bonus(sim.state, 'mend') > 0);
  assert.ok(bonus(sim.state, 'research') > 0);
});

test('a charcoal kiln makes the fire last longer', () => {
  const burnFor = (built) => {
    const game = createGame({ seed: 9 });
    game.perform(game.actions()[0].id);
    game.state.built.push(...built);
    game.state.fire.fuel = 10;
    game.state.people = [];
    for (let i = 0; i < 20; i++) {
      game.state.event = null;
      game.tick(1);
    }
    return game.state.fire.fuel;
  };
  assert.ok(burnFor(['kiln']) > burnFor([]));
});

// ── 12. New places ───────────────────────────────────────────────────

test('the new places draw on real encounters, hold no memories, and are found somehow', () => {
  const added = ['quarry', 'lake', 'farm', 'station', 'pass'];
  for (const id of added) {
    const location = LOCATIONS.find((l) => l.id === id);
    assert.ok(location, id);
    assert.deepEqual(location.scenes, [], `${id} must not move a memory`);
    for (const encounter of location.encounters) assert.ok(EVENT_BY_ID[encounter], `${id}: ${encounter}`);
  }
  const maps = PROJECTS.find((p) => p.id === 'maps');
  for (const id of ['quarry', 'lake', 'farm']) assert.ok(maps.flags.includes(`loc-${id}`));
});

test('an errand someone asked of you joins the trip, about them', () => {
  const game = createGame({ seed: 6 });
  const sim = { state: game.state, rng: createRng(game.state), emit() {} };
  game.perform(game.actions()[0].id);
  const person = settle(sim, 'Ines');
  scheduleChain(sim, { id: 'ring', stage: 'ring-2', wait: [999, 999] }, { name: person.name, person: person.id });
  applyEffects(sim, [{ venture: 'suburb' }]);
  const seen = [];
  for (let i = 0; i < 10 && game.state.expedition; i++) {
    seen.push(game.state.event.id);
    if (game.state.event.id === 'request-found') assert.equal(game.state.event.ctx.person, person.id);
    choose(sim, game.event().choices.find((c) => c.enabled).id);
  }
  assert.ok(seen.includes('request-found'), seen.join(','));
  assert.ok(game.state.flags['request-ring']);
});

test('seasonal encounters only happen in their season', () => {
  const sim = makeSim();
  assert.equal(meets(sim.state, EVENT_BY_ID['farm-orchard'].when), false, 'no apples in the first winter');
  assert.equal(meets(sim.state, EVENT_BY_ID['lake-ice'].when), true, 'ice in the first winter');
});

// ── 13. The turning year ─────────────────────────────────────────────

test('after the thaw the year turns: seasons, chapters, the second winter and its ending', () => {
  const { game, endings } = long();
  assert.deepEqual(endings.slice(0, 2), ['thaw', 'settled'], `endings: ${endings}`);
  assert.equal(game.state.chapter, 9);
  assert.ok(yearOf(game.state) >= 3);
  assert.ok(['spring', 'summer'].includes(seasonIdOf(game.state)));
  const records = game.state.history.records.map((r) => r.text).join('\n');
  assert.match(records, /second winter came/);
});

test('heat and storms keep to their seasons', () => {
  const sim = makeSim();
  assert.equal(meets(sim.state, WEATHER_BY_ID.heat.when), false);
  assert.equal(meets(sim.state, WEATHER_BY_ID.storm.when), false);
  assert.equal(WEATHER_BY_ID.storm.looks, 'rain');
  assert.ok(WEATHER_BY_ID.heat.thirst > 1);
});

// ── 14. Aims ─────────────────────────────────────────────────────────

test('aims are well formed, and a long game achieves several', () => {
  for (const aim of AIMS) for (const key of Object.keys(aim.when)) assert.ok(CONDITION_KEYS.includes(key), `${aim.id}: ${key}`);
  const { game } = long();
  const achieved = game.aims().filter((aim) => aim.done);
  assert.ok(achieved.length >= 4, achieved.map((aim) => aim.id).join(','));
  assert.ok(achieved.some((aim) => aim.id === 'two-winters'));
});

// ── 15. Saves ────────────────────────────────────────────────────────

test('a save from before the expansion still loads and plays', () => {
  const { game } = playthrough({ seed: 12, minutes: 15 });
  const old = game.serialize();
  for (const key of ['roaring', 'chains', 'research', 'history']) delete old[key];
  for (const person of old.people) {
    delete person.trust;
    delete person.bonds;
    delete person.arc;
  }
  const restored = createGame({ save: old });
  assert.ok(restored.state.chains && restored.state.research && restored.state.history);
  for (let i = 0; i < 600; i++) {
    if (restored.state.event) restored.choose(restored.event().choices.find((c) => c.enabled).id);
    restored.tick(1);
  }
  assert.ok(restored.people().members.every((member) => member.trust >= 0 && member.trust <= 1));
  assert.ok(restoreState(JSON.parse(JSON.stringify(restored.serialize()))), 'and saves again');
});

test('a long game is deterministic, through every new system', () => {
  const run = () => playthrough({ seed: 33, minutes: 110, carryOn: true }).game.serialize();
  assert.deepEqual(run(), run());
});

// ── Balance ──────────────────────────────────────────────────────────

test('a careful settler keeps the camp alive through the second winter', () => {
  const { game, firstSurvivor } = long();
  assert.ok(firstSurvivor / 60 >= 3 && firstSurvivor / 60 <= 7, `first survivor at ${firstSurvivor / 60} min`);
  assert.ok(game.state.people.length >= 6, `${game.state.people.length} left`);
  assert.ok(game.state.history.dead.length <= 4, `${game.state.history.dead.length} dead`);
});
