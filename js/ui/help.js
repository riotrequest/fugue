import { byId, el, setClass, setText } from './dom.js';
import { HELP_SECTIONS } from './help-content.js';

const TOGGLE_KEYS = ['?', 'h'];
const NAV_KEYS = { ArrowUp: -1, ArrowLeft: -1, ArrowDown: 1, ArrowRight: 1 };

/**
 * The field guide: a tabbed card opened from the toolbar, the title screen, or
 * the ? and H keys. Time stands still while it is open. Sections unlock as the
 * player meets what they describe; the toolbar button pulses while any
 * unlocked section is still unread, and newly unlocked tabs carry a dot.
 *
 * @param {import('../sim/index.js').Game} game
 * @param {{
 *   isPaused: () => boolean,
 *   seen: string[],
 *   onSeen: (ids: string[]) => void,
 *   onOpenChange: (open: boolean) => void,
 * }} hooks
 */
export function createHelp(game, { isPaused, seen: seenAtStart, onSeen, onOpenChange }) {
  const overlay = byId('help');
  const nav = byId('help-nav');
  const page = byId('help-page');
  const button = byId('btn-help');

  const isUnlocked = (section) => !section.unlocked || section.unlocked(game);
  const unlockedIds = () => HELP_SECTIONS.filter(isUnlocked).map((section) => section.id);

  let seen = new Set(seenAtStart);
  /** Sections unlocked since the guide was last opened; they wear a dot while it is open. */
  let fresh = new Set();
  let current = HELP_SECTIONS[0].id;
  let open = false;

  const tabs = new Map(
    HELP_SECTIONS.map((section) => [
      section.id,
      el(
        'button',
        { class: 'help__tab', type: 'button', role: 'tab', onClick: () => show(section.id) },
        el('span', { class: 'help__tab-label' }),
        el('span', { class: 'help__dot', 'aria-hidden': 'true' }),
      ),
    ]),
  );
  nav.append(...tabs.values());

  const renderKeys = (keys) =>
    el(
      'span',
      { class: 'help__keys' },
      keys.map((key) => (key === '–' ? el('span', { class: 'help__sep' }, '–') : el('kbd', {}, key))),
    );

  const renderPoint = (point) =>
    typeof point === 'string'
      ? el('li', { class: 'help__point' }, point)
      : el('li', { class: 'help__point help__point--keys' }, renderKeys(point.keys), el('span', {}, point.text));

  function paintTabs() {
    for (const section of HELP_SECTIONS) {
      const tab = tabs.get(section.id);
      const unlocked = isUnlocked(section);
      setText(tab.firstElementChild, unlocked ? section.title : '· · ·');
      tab.setAttribute('aria-disabled', String(!unlocked));
      tab.setAttribute('aria-selected', String(section.id === current));
      tab.tabIndex = section.id === current ? 0 : -1;
      tab.title = unlocked ? '' : 'not found yet';
      setClass(tab, 'help__tab--fresh', fresh.has(section.id));
    }
  }

  function show(id) {
    const index = HELP_SECTIONS.findIndex((section) => section.id === id);
    const section = HELP_SECTIONS[index];
    if (!section || !isUnlocked(section)) return;
    current = id;
    fresh.delete(id);
    page.replaceChildren(
      el('p', { class: 'help__num' }, `${String(index + 1).padStart(2, '0')} / ${String(HELP_SECTIONS.length).padStart(2, '0')}`),
      el('h3', { class: 'help__title' }, section.title),
      el('p', { class: 'help__lead' }, section.lead),
      el('ul', { class: 'help__points' }, section.points.map(renderPoint)),
    );
    paintTabs();
  }

  /** Moves to the next or previous unlocked tab, wrapping. */
  function step(direction) {
    const open = HELP_SECTIONS.filter(isUnlocked);
    const index = open.findIndex((section) => section.id === current);
    const next = open[(index + direction + open.length) % open.length];
    show(next.id);
    tabs.get(next.id).focus();
  }

  function openHelp() {
    if (open) return;
    const ids = unlockedIds();
    // Only discoveries get a dot; the always-open basics would just be noise.
    fresh = new Set(
      HELP_SECTIONS.filter((section) => section.unlocked && ids.includes(section.id) && !seen.has(section.id)).map(
        (section) => section.id,
      ),
    );
    seen = new Set([...seen, ...ids]);
    onSeen([...seen]);

    open = true;
    overlay.hidden = false;
    button.classList.remove('tool--new');
    onOpenChange(true);
    show(HELP_SECTIONS.find((section) => fresh.has(section.id))?.id ?? current);
    tabs.get(current).focus();
  }

  function closeHelp() {
    if (!open) return;
    open = false;
    overlay.hidden = true;
    fresh.clear();
    onOpenChange(false);
    button.focus();
  }

  button.addEventListener('click', () => (open ? closeHelp() : openHelp()));
  byId('help-close').addEventListener('click', closeHelp);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeHelp();
  });
  nav.addEventListener('keydown', (event) => {
    if (!(event.key in NAV_KEYS)) return;
    event.preventDefault();
    step(NAV_KEYS[event.key]);
  });
  document.addEventListener('keydown', (event) => {
    if (isPaused() || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === 'Escape' && open) {
      closeHelp();
      // Claims the key, so the same Escape does not go on to pause the game.
      event.preventDefault();
    } else if (TOGGLE_KEYS.includes(event.key.toLowerCase())) {
      if (open) closeHelp();
      else openHelp();
      event.preventDefault();
    }
  });

  return {
    open: openHelp,
    isOpen: () => open,
    refresh() {
      if (open) return;
      setClass(button, 'tool--new', unlockedIds().some((id) => !seen.has(id)));
    },
  };
}
