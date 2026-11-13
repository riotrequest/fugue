import { DIFFICULTY } from '../sim/tuning.js';
import { byId, el, paragraphs, setClass, setText } from './dom.js';

/** Ignore input briefly after a card opens so a stray click can't pick a choice. */
const ARM_DELAY_MS = 400;
const CARD_TONES = ['danger', 'memory'];

/**
 * Story events: a card of prose and numbered choices (click or press 1–9).
 * @param {import('../sim/index.js').Game} game
 * @param {{ afterInput: () => void, isPaused: () => boolean }} hooks
 */
export function createEventCard(game, { afterInput, isPaused }) {
  const overlay = byId('event');
  const card = overlay.firstElementChild;
  const title = byId('event-title');
  const body = byId('event-body');
  const choices = byId('event-choices');

  let shown = null;
  let armedAt = 0;

  const choose = (choice) => {
    if (performance.now() < armedAt) return;
    game.choose(choice.id);
    afterInput();
  };

  const renderChoice = (choice, index) =>
    el(
      'li',
      {},
      el(
        'button',
        {
          class: 'choice',
          type: 'button',
          'aria-disabled': String(!choice.enabled),
          onClick: () => choose(choice),
        },
        el('span', { class: 'choice__key' }, `${index + 1}.`),
        choice.label,
        choice.hint || choice.reason
          ? el('span', { class: 'choice__hint' }, (choice.enabled ? choice.hint : choice.reason) ?? choice.hint)
          : null,
      ),
    );

  const signature = (event) =>
    [event.id, event.text, ...event.choices.map((c) => `${c.id}:${c.enabled}`)].join('|');

  document.addEventListener('keydown', (keyEvent) => {
    const event = game.event();
    if (!event || isPaused() || keyEvent.repeat || keyEvent.ctrlKey || keyEvent.metaKey || keyEvent.altKey) return;
    const choice = event.choices[Number(keyEvent.key) - 1];
    if (choice) choose(choice);
  });

  return {
    refresh() {
      const event = game.event();
      overlay.hidden = !event;
      if (!event) {
        shown = null;
        return;
      }

      const next = signature(event);
      if (next === shown) return;
      if (shown === null || !shown.startsWith(`${event.id}|`)) armedAt = performance.now() + ARM_DELAY_MS;
      shown = next;

      setText(title, event.title);
      body.replaceChildren(...paragraphs(event.text));
      choices.replaceChildren(...event.choices.map(renderChoice));
      for (const tone of CARD_TONES) setClass(card, `card--${tone}`, event.tone === tone);
    },
  };
}

/**
 * The journal of recovered memories. The toolbar button appears with the
 * first fragment and pulses when a new one is found.
 * @param {import('../sim/index.js').Game} game
 * @param {{ isPaused: () => boolean }} hooks
 */
export function createJournal(game, { isPaused }) {
  const overlay = byId('journal');
  const list = byId('journal-list');
  const button = byId('btn-journal');

  const renderEntry = (memory) =>
    memory.found
      ? el(
          'li',
          {},
          el('h3', { class: 'journal__title' }, memory.title),
          el('div', { class: 'journal__text' }, paragraphs(memory.text)),
        )
      : el('li', { class: 'journal__entry--lost' }, '· · ·');

  const open = () => {
    list.replaceChildren(...game.memories().map(renderEntry));
    button.classList.remove('tool--new');
    overlay.hidden = false;
  };
  const close = () => {
    overlay.hidden = true;
  };

  button.addEventListener('click', open);
  byId('journal-close').addEventListener('click', close);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || overlay.hidden || isPaused()) return;
    close();
    // Claims the key, so the same Escape does not go on to pause the game.
    event.preventDefault();
  });

  let foundCount = null;

  return {
    refresh() {
      const memories = game.memories();
      const found = memories.filter((memory) => memory.found).length;
      button.hidden = found === 0;
      setText(button, `memories ${found}/${memories.length}`);
      if (foundCount !== null && found > foundCount) button.classList.add('tool--new');
      foundCount = found;
    },
  };
}

/**
 * The curtain: title screen before play, ending screen after.
 * @param {import('../sim/index.js').Game} game
 * @param {{
 *   hasSave: boolean, difficulty: string, onDifficulty: (id: string) => void,
 *   onBegin: () => void, onRestart: () => void, onHelp: () => void,
 * }} hooks
 */
export function createCurtain(game, { hasSave, difficulty, onDifficulty, onBegin, onRestart, onHelp }) {
  const overlay = byId('curtain');
  const panel = overlay.firstElementChild;
  const title = byId('curtain-title');
  const body = byId('curtain-body');
  const actions = byId('curtain-actions');

  const button = (label, onClick, quiet = false) =>
    el('button', { class: quiet ? 'choice choice--quiet' : 'choice', type: 'button', onClick }, label);

  /** A new game picks easy, normal or hard; a saved one says which it is. */
  const difficultyPicker = () => {
    const note = el('p', { class: 'difficulty__hint' });
    const options = Object.entries(DIFFICULTY).map(([id, { label }]) => [
      id,
      el('button', { class: 'difficulty__option', type: 'button', onClick: () => pick(id) }, label),
    ]);
    const pick = (id) => {
      if (!game.setDifficulty(id)) return;
      onDifficulty(id);
      for (const [optionId, option] of options) option.setAttribute('aria-pressed', String(optionId === id));
      setText(note, DIFFICULTY[id].hint);
    };
    pick(DIFFICULTY[difficulty] ? difficulty : 'normal');
    return [el('div', { class: 'difficulty', role: 'group', 'aria-label': 'difficulty' }, options.map(([, option]) => option)), note];
  };

  const showTitle = () => {
    body.replaceChildren(
      el('p', {}, 'The world ended. You do not remember it.'),
      el('p', {}, 'There is a fire. It is almost out.'),
      ...(hasSave ? [el('p', { class: 'difficulty__hint' }, `difficulty: ${game.status().difficulty}`)] : difficultyPicker()),
    );
    const begin = button(hasSave ? 'return to the fire' : 'wake', () => {
      overlay.hidden = true;
      onBegin();
    });
    actions.replaceChildren(
      begin,
      button('how to play', onHelp, true),
      ...(hasSave ? [button('begin again', onRestart, true)] : []),
    );
  };

  let endedId = null;

  const showEnding = (ending) => {
    endedId = ending.id;
    panel.classList.add('curtain--ending');
    setText(title, ending.title);
    body.replaceChildren(...paragraphs(ending.text));
    // Some endings leave the camp standing: the player may stay and keep it going.
    const keepGoing = button('keep the fire', () => {
      if (!game.continueAfterEnding()) return;
      overlay.hidden = true;
      panel.classList.remove('curtain--ending');
      // A reloaded save can open straight onto the ending, before play ever began.
      onBegin();
    });
    actions.replaceChildren(
      ...(ending.canContinue ? [keepGoing, button('begin again', onRestart, true)] : [button('begin again', onRestart)]),
    );
    overlay.hidden = false;
    actions.firstElementChild.focus();
  };

  showTitle();

  return {
    refresh() {
      const { ended } = game.status();
      // An ending waits for any final card to be read before the curtain falls.
      if (ended && ended.id !== endedId && !game.event()) showEnding(ended);
    },
  };
}
