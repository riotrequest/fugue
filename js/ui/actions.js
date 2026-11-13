import { el, groupBy, setClass, setDisabled, setText, syncList } from './dom.js';

/**
 * The action board: every currently visible action, grouped, with cost and
 * cooldown. Buttons are reconciled by id so new actions fade in on their own
 * and nothing re-renders while the player is mid-click.
 * @param {HTMLElement} root
 * @param {HTMLElement} hintLine
 * @param {import('../sim/index.js').Game} game
 * @param {{ afterInput: () => void }} hooks
 */
/** Cooldowns at least this long count down on the button; shorter ones just show the fill. */
const COUNTDOWN_FROM = 20;

/** 45 -> "45s", 90 -> "1:30". */
function formatWait(seconds) {
  const whole = Math.ceil(seconds);
  if (whole < 60) return `${whole}s`;
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

/**
 * Why a greyed button is greyed, written on the button so nobody has to hover.
 * A shortfall in materials is left out: the cost line already turns red.
 */
function noteOf(action) {
  if (action.enabled) return '';
  const short = (action.cost ?? []).some((entry) => entry.have < entry.amount);
  if (action.reason && !short) return action.reason;
  const { cooldown } = action;
  if (!action.reason && cooldown && cooldown.total >= COUNTDOWN_FROM) return `ready in ${formatWait(cooldown.remaining)}`;
  return '';
}

export function createActions(root, hintLine, game, { afterInput }) {
  /** @type {WeakMap<HTMLElement, { label: HTMLElement, cost: HTMLElement, note: HTMLElement, action: object }>} */
  const parts = new WeakMap();
  let hintedId = null;

  const describe = (action) =>
    [action.hint, action.enabled ? null : action.reason].filter(Boolean).join(' — ');

  const showHint = (button) => {
    const { action } = parts.get(button);
    hintedId = action.id;
    setText(hintLine, describe(action));
  };

  const clearHint = () => {
    hintedId = null;
    setText(hintLine, '');
  };

  const createButton = (action) => {
    const label = el('span', { class: 'action__label' });
    const cost = el('span', { class: 'action__cost' });
    const note = el('span', { class: 'action__note' });
    const button = el(
      'button',
      {
        class: 'action',
        type: 'button',
        onClick: () => {
          game.perform(action.id);
          afterInput();
        },
        onPointerenter: () => showHint(button),
        onPointerleave: clearHint,
        onFocus: () => showHint(button),
        onBlur: clearHint,
      },
      el('span', { class: 'action__fill' }),
      label,
      cost,
      note,
    );
    parts.set(button, { label, cost, note, action });
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
    refs.action = action;
    setText(refs.label, action.label);
    setDisabled(button, !action.enabled);
    setText(refs.note, noteOf(action));

    const { cooldown } = action;
    const remaining = cooldown && cooldown.total > 0 ? cooldown.remaining / cooldown.total : 0;
    button.style.setProperty('--cooldown', remaining.toFixed(3));

    syncList(refs.cost, action.cost ?? [], {
      key: (entry) => entry.id,
      create: () => el('span', { class: 'cost' }),
      update: updateCost,
    });

    if (hintedId === action.id) setText(hintLine, describe(action));
  };

  const createGroup = ([, actions]) =>
    el(
      'section',
      { class: 'group' },
      el('h2', { class: 'group__title' }, actions[0].groupLabel ?? actions[0].group),
      el('div', { class: 'group__list' }),
    );

  const updateGroup = (section, [, actions]) => {
    syncList(section.lastElementChild, actions, {
      key: (action) => action.id,
      create: createButton,
      update: updateButton,
    });
  };

  return {
    refresh() {
      const groups = [...groupBy(game.actions(), (action) => action.group)];
      syncList(root, groups, { key: ([id]) => id, create: createGroup, update: updateGroup });
    },
  };
}
