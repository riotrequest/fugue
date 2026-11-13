import { byId, el, setText } from './dom.js';

/**
 * The notebook: what the camp is working out, and what it remembers. Two pages,
 * switched by tabs: projects (choose one to work on) and the chronicle (the
 * turns the settlement has lived through, and the names of its dead). The
 * world keeps moving while it is open, so it redraws on every refresh.
 */

const STATUS_WORDS = { done: 'worked out', active: 'working on it', open: '', locked: 'not yet' };

/** "1 cloth · 2 wire" from a project's cost. */
const costLine = (cost) => cost.map((item) => `${item.amount} ${item.id}`).join(' · ');

/**
 * @param {import('../sim/index.js').Game} game
 * @param {{ isPaused: () => boolean, afterInput: () => void }} hooks
 */
export function createNotebook(game, { isPaused, afterInput }) {
  const overlay = byId('notebook');
  const button = byId('btn-notebook');
  const tabs = byId('notebook-tabs');
  const page = byId('notebook-page');
  const status = byId('notebook-status');
  let open = false;
  let tab = 'projects';
  let doneCount = null;
  let lastSignature = '';

  const progress = (value) =>
    el('span', { class: 'meter meter--ok project__meter' }, el('span', { class: 'meter__fill', style: `--value: ${value.toFixed(3)}` }));

  const renderProject = (project, active) => {
    const choose = el(
      'button',
      {
        class: 'choice project__choose',
        type: 'button',
        onClick: () => {
          if (game.study(project.id)) afterInput();
          refresh();
        },
      },
      project.status === 'active' ? 'working on it' : active ? 'work on this instead' : 'work on this',
    );
    const blocked = project.status === 'locked' || Boolean(project.reason);
    if (blocked || project.status === 'active') choose.setAttribute('aria-disabled', 'true');
    return el(
      'li',
      { class: `project project--${project.status}` },
      el(
        'div',
        { class: 'project__head' },
        el('h3', { class: 'project__title' }, project.title),
        el('span', { class: 'project__status' }, STATUS_WORDS[project.status]),
      ),
      project.status === 'done' ? null : progress(project.progress),
      el('p', { class: 'project__text' }, project.text),
      project.unlocks.length > 0 ? el('p', { class: 'project__unlocks' }, project.unlocks.join(' · ')) : null,
      project.cost.length > 0 ? el('p', { class: 'project__cost' }, `to begin: ${costLine(project.cost)}`) : null,
      project.reason ? el('p', { class: 'project__reason' }, project.reason) : null,
      project.status === 'done' ? null : choose,
    );
  };

  const renderProjects = (notebook) => {
    const active = notebook.projects.find((project) => project.status === 'active');
    setText(
      status,
      active
        ? `working on ${active.title.toLowerCase()} · ${Math.round(active.progress * 100)}%`
        : 'nothing on the page yet: choose something to work out',
    );
    // Open work first, then what is waiting on something, then what is done.
    const order = { active: 0, open: 1, locked: 2, done: 3 };
    const projects = [...notebook.projects].sort((a, b) => order[a.status] - order[b.status]);
    page.replaceChildren(el('ol', { class: 'projects' }, projects.map((project) => renderProject(project, Boolean(active)))));
  };

  const renderChronicle = () => {
    const history = game.history();
    setText(status, history.dead.length > 0 ? `${history.dead.length} buried` : 'what the camp remembers');
    const records = [...history.records].reverse();
    const parts = [
      records.length > 0
        ? el('ol', { class: 'chronicle' }, records.map((record) => el('li', {}, el('span', { class: 'chronicle__day' }, `day ${record.day}`), record.text)))
        : el('p', { class: 'chronicle__empty' }, 'Nothing yet. Give it time.'),
      history.dead.length > 0
        ? el(
            'p',
            { class: 'chronicle__dead' },
            `The dead: ${history.dead.map((entry) => entry.name).join(', ')}.`,
          )
        : null,
    ];
    page.replaceChildren(...parts.filter(Boolean));
  };

  const renderAims = () => {
    const aims = game.aims();
    const done = aims.filter((aim) => aim.done).length;
    setText(status, `${done} of ${aims.length} aims achieved`);
    page.replaceChildren(
      el(
        'ol',
        { class: 'aims' },
        aims.map((aim) =>
          el(
            'li',
            { class: `aim${aim.done ? ' aim--done' : ''}` },
            el('span', { class: 'aim__mark', 'aria-hidden': 'true' }, aim.done ? '✓' : '·'),
            el('span', { class: 'aim__title' }, aim.title),
            el('span', { class: 'aim__hint' }, aim.hint),
          ),
        ),
      ),
    );
  };

  const renderTabs = () => {
    tabs.replaceChildren(
      ...[
        ['projects', 'the work'],
        ['aims', 'aims'],
        ['chronicle', 'the camp’s story'],
      ].map(([id, label]) =>
        el(
          'button',
          {
            class: `tab${tab === id ? ' tab--on' : ''}`,
            type: 'button',
            role: 'tab',
            'aria-selected': String(tab === id),
            onClick: () => {
              tab = id;
              refresh();
            },
          },
          label,
        ),
      ),
    );
  };

  function refresh() {
    const notebook = game.notebook();
    button.hidden = !notebook;
    if (notebook) {
      const done = notebook.projects.filter((project) => project.status === 'done').length;
      setText(button, `notebook ${done}/${notebook.projects.length}`);
      if (doneCount !== null && done > doneCount && !open) button.classList.add('tool--new');
      doneCount = done;
    }
    if (!open || !notebook) return;
    // Redraw only when something visible changed, so a click is never lost to a rebuilt button.
    const shown =
      tab === 'projects'
        ? notebook.projects.map((project) => `${project.id}:${project.status}:${Math.floor(project.progress * 100)}:${project.reason}:${project.cost.length}`).join('|')
        : tab === 'aims'
          ? game.aims().map((aim) => Number(aim.done)).join('')
          : `${game.history().records.length}:${game.history().dead.length}`;
    const signature = `${tab}/${shown}`;
    if (signature === lastSignature) return;
    lastSignature = signature;
    renderTabs();
    if (tab === 'projects') renderProjects(notebook);
    else if (tab === 'aims') renderAims();
    else renderChronicle();
  }

  const show = () => {
    open = true;
    lastSignature = '';
    overlay.hidden = false;
    button.classList.remove('tool--new');
    refresh();
    byId('notebook-close').focus();
  };
  const close = () => {
    open = false;
    overlay.hidden = true;
    button.focus();
  };

  button.addEventListener('click', show);
  byId('notebook-close').addEventListener('click', close);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || overlay.hidden || isPaused()) return;
    close();
    event.preventDefault();
  });

  return { refresh, isOpen: () => open };
}
