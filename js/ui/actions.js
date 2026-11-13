import { el, setClass, setDisabled, setText, syncList } from './dom.js';
import {
  detailOf, foldStartsClosed, layoutOf, noteOf, noteToneOf, quickActions, splitBoard, stateOf,
} from './action-board.js';

/** Where the chosen tab and folds are kept, for this browser tab only. */
const SESSION_KEY = 'fugue.actions';

/** Stands in the board's list where the actions that cannot be done yet begin. */
const FOLD = Symbol('fold');

const TAB_KEYS = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 };

function readSession() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? 'null');
    if (saved && typeof saved === 'object') {
      return { tab: saved.tab ?? null, folds: saved.folds ?? {}, tabbed: Boolean(saved.tabbed) };
    }
  } catch {
    // Private windows and blocked storage: the panel just starts on its first tab.
  }
  return { tab: null, folds: {}, tabbed: false };
}

function writeSession(session) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Not worth bothering anyone about.
  }
}

/**
 * The action panel: a strip of survival basics, a tab for each kind of action,
 * and compact buttons with cost, cooldown and the reason they cannot be done.
 * Every button is reconciled by id, so routine refreshes never rebuild the
 * panel, steal focus, move the scroll or change tab. Buttons in the strip and
 * in the tabs are fed the same ActionView each refresh and both call
 * game.perform, so they cannot drift apart.
 *
 * @param {{ quick: HTMLElement, tabs: HTMLElement, board: HTMLElement, hint: HTMLElement }} nodes
 * @param {import('../sim/index.js').Game} game
 * @param {{ afterInput: () => void }} hooks
 */
export function createActions({ quick, tabs, board, hint }, game, { afterInput }) {
  /** @type {WeakMap<HTMLElement, { label: HTMLElement, cost: HTMLElement, note: HTMLElement }>} */
  const parts = new WeakMap();
  /** The latest view of every listed action, by id, for the hint line. */
  let latest = new Map();

  const session = readSession();
  let current = session.tab;
  /** Action ids already listed, so only later arrivals mark their tab. Null until the first refresh. */
  let known = null;
  const fresh = new Set();
  const scrollOf = new Map();

  // ---------- hint ----------

  /** What the hint line describes: the pointer wins, then focus, then the last thing tapped. */
  const pointed = { hover: null, focus: null, touch: null };
  const hintName = el('span', { class: 'hint__name' });
  const hintText = el('span', { class: 'hint__text' });
  const hintWhy = el('span', { class: 'hint__why' });
  hint.replaceChildren(hintName, hintText, hintWhy);

  const paintHint = () => {
    const id = pointed.hover ?? pointed.focus ?? pointed.touch;
    const action = id ? latest.get(id) : null;
    setClass(hint, 'hint--idle', !action);
    setText(hintName, action ? action.label : '');
    setText(hintText, action ? action.hint : '');
    setText(hintWhy, action ? detailOf(action) : '');
    hint.dataset.state = action ? stateOf(action) : '';
  };

  // ---------- buttons ----------

  const createButton = (action, variant) => {
    const { id } = action;
    const label = el('span', { class: 'action__label' });
    const cost = el('span', { class: 'action__cost' });
    const note = el('span', { class: 'action__note' });
    const button = el(
      'button',
      {
        class: `action action--${variant}`,
        type: 'button',
        onClick: () => {
          game.perform(id);
          afterInput();
        },
        onPointerenter: (event) => {
          if (event.pointerType === 'touch') return;
          pointed.hover = id;
          paintHint();
        },
        onPointerleave: () => {
          if (pointed.hover !== id) return;
          pointed.hover = null;
          paintHint();
        },
        // A tap both does the thing and leaves its description showing until the next tap.
        onPointerdown: (event) => {
          if (event.pointerType !== 'touch') return;
          pointed.touch = id;
          paintHint();
        },
        onFocus: () => {
          pointed.focus = id;
          paintHint();
        },
        onBlur: () => {
          if (pointed.focus !== id) return;
          pointed.focus = null;
          paintHint();
        },
        // Fade in once. Hidden tabs would otherwise replay it every time they are shown.
        onAnimationend: () => button.classList.add('action--settled'),
      },
      el('span', { class: 'action__fill', 'aria-hidden': 'true' }),
      label,
      cost,
      note,
    );
    parts.set(button, { label, cost, note });
    return button;
  };

  // Short costs show progress ("wood 24/40") so it is clear how far there is to go.
  const updateCost = (node, entry) => {
    const short = entry.have < entry.amount;
    setText(node, short ? `${entry.label} ${Math.floor(entry.have)}/${entry.amount}` : `${entry.label} ${entry.amount}`);
    setClass(node, 'cost--short', short);
  };

  const updateButton = (button, action) => {
    const refs = parts.get(button);
    setText(refs.label, action.label);
    setDisabled(button, !action.enabled);
    setText(refs.note, noteOf(action));
    const tone = noteToneOf(action);
    if (refs.note.dataset.tone !== tone) refs.note.dataset.tone = tone;
    const state = stateOf(action);
    if (button.dataset.state !== state) button.dataset.state = state;

    const { cooldown } = action;
    const remaining = cooldown && cooldown.total > 0 ? cooldown.remaining / cooldown.total : 0;
    button.style.setProperty('--cooldown', remaining.toFixed(3));

    syncList(refs.cost, action.cost ?? [], {
      key: (entry) => entry.id,
      create: () => el('span', { class: 'cost' }),
      update: updateCost,
    });
  };

  // ---------- quick strip ----------

  const createQuick = (action) => createButton(action, 'quick');

  // ---------- tabs and boards ----------

  const tabIdOf = (group) => `actions-tab-${group}`;
  const panelIdOf = (group) => `actions-panel-${group}`;

  const select = (group, { focus = false } = {}) => {
    if (group === current) return;
    if (current) scrollOf.set(current, board.scrollTop);
    current = group;
    session.tab = group;
    writeSession(session);
    fresh.delete(group);
    refresh();
    board.scrollTop = scrollOf.get(group) ?? 0;
    if (focus) document.getElementById(tabIdOf(group))?.focus();
  };

  const createTab = (category) =>
    el(
      'button',
      {
        class: 'tab',
        type: 'button',
        role: 'tab',
        id: tabIdOf(category.id),
        'aria-controls': panelIdOf(category.id),
        onClick: () => select(category.id),
      },
      el('span', { class: 'tab__label' }),
      el('span', { class: 'tab__dot', 'aria-hidden': 'true' }),
    );

  const updateTab = (tab, category) => {
    const selected = category.id === current;
    setText(tab.firstElementChild, category.label);
    if (tab.getAttribute('aria-selected') !== String(selected)) tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    setClass(tab, 'tab--fresh', fresh.has(category.id));
    // Something can be done here right now: a faint mark, so other tabs are worth a look.
    setClass(tab, 'tab--ready', category.actions.some((action) => action.enabled));
  };

  tabs.addEventListener('keydown', (event) => {
    const ids = [...tabs.children].map((tab) => tab.dataset.key);
    if (!ids.length) return;
    const at = ids.indexOf(current);
    let next = null;
    if (event.key in TAB_KEYS) next = ids[(at + TAB_KEYS[event.key] + ids.length) % ids.length];
    else if (event.key === 'Home') next = ids[0];
    else if (event.key === 'End') next = ids[ids.length - 1];
    if (next === null) return;
    event.preventDefault();
    select(next, { focus: true });
  });

  const isFolded = (group, lockedCount, openCount) => session.folds[group] ?? foldStartsClosed(lockedCount, openCount);

  const createFold = (group) => {
    const button = el(
      'button',
      {
        class: 'fold',
        type: 'button',
        onClick: () => {
          const panel = button.closest('.board');
          session.folds[group] = !panel.classList.contains('board--folded');
          writeSession(session);
          refresh();
        },
      },
      el('span', { class: 'fold__mark', 'aria-hidden': 'true' }),
      el('span', { class: 'fold__label' }),
    );
    return button;
  };

  const createPanel = (category) =>
    el('div', {
      class: 'board',
      role: 'tabpanel',
      id: panelIdOf(category.id),
      'aria-labelledby': tabIdOf(category.id),
    });

  const updatePanel = (panel, category) => {
    panel.hidden = category.id !== current;
    const { open, locked } = splitBoard(category.actions);
    const folded = locked.length > 0 && isFolded(category.id, locked.length, open.length);
    setClass(panel, 'board--folded', folded);
    const lockedIds = new Set(locked.map((action) => action.id));
    const items = locked.length ? [...open, FOLD, ...locked] : open;

    syncList(panel, items, {
      key: (item) => (item === FOLD ? '~fold' : item.id),
      create: (item) => (item === FOLD ? createFold(category.id) : createButton(item, 'card')),
      update: (node, item) => {
        if (item === FOLD) {
          setText(node.lastElementChild, `not yet · ${locked.length}`);
          node.setAttribute('aria-expanded', String(!folded));
          return;
        }
        updateButton(node, item);
        setClass(node, 'action--locked', lockedIds.has(item.id));
      },
    });
  };

  // ---------- refresh ----------

  function refresh() {
    const actions = game.actions();
    latest = new Map(actions.map((action) => [action.id, action]));
    const { tabbed, categories } = layoutOf(actions, session.tabbed);
    if (tabbed && !session.tabbed) {
      session.tabbed = true;
      writeSession(session);
    }

    // The chosen tab survives every refresh; only a tab that no longer exists gives way.
    const chosen = tabbed ? (session.tab ?? current) : current;
    current = categories.some((category) => category.id === chosen) ? chosen : (categories[0]?.id ?? null);

    // New arrivals elsewhere mark their tab until it is opened.
    if (known && tabbed) {
      for (const action of actions) {
        if (!known.has(action.id) && action.group !== current) fresh.add(action.group);
      }
    }
    known = new Set(actions.map((action) => action.id));
    fresh.delete(current);

    // Until there are tabs, the strip would only repeat the list beside it.
    tabs.hidden = !tabbed;
    const basics = tabbed ? quickActions(actions) : [];
    quick.hidden = basics.length === 0;

    syncList(quick, basics, { key: (action) => action.id, create: createQuick, update: updateButton });
    syncList(tabs, categories, { key: (category) => category.id, create: createTab, update: updateTab });
    syncList(board, categories, { key: (category) => category.id, create: createPanel, update: updatePanel });
    paintHint();
  }

  return { refresh };
}
