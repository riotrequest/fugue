import { el, groupBy, setClass, setDisabled, setText, syncList } from './dom.js';

const TONES = ['ok', 'warn', 'danger'];
const CHANGE_FLASH_MS = 600;
/** How long a role row stays marked after it loses a worker the player did not move. */
const LOST_FLASH_MS = 4000;

/**
 * Tools in hand for a job, one per worker: "axes 1/2" while working, or what is
 * ready ("spears 1") before anyone is assigned. Empty for jobs without a tool.
 */
function toolNote(role) {
  const { tool } = role;
  if (!tool) return '';
  if (role.count > 0) return `${tool.label} ${Math.min(tool.have, role.count)}/${role.count}`;
  if (tool.required) return tool.have > 0 ? `${tool.label} ${tool.have}` : `needs ${tool.label}`;
  return '';
}

/** Whole numbers stay whole; fractional stores show one decimal. */
function formatAmount(amount) {
  const rounded = Math.floor(amount * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/**
 * Fire and body: one bar per revealed vital.
 * @param {HTMLElement} root
 * @param {import('../sim/index.js').Game} game
 */
export function createVitals(root, game) {
  const create = (vital) =>
    el(
      'div',
      { class: `vital vital--${vital.id}` },
      el('span', { class: 'vital__label' }),
      el('span', { class: 'vital__bar' }, el('span', { class: 'vital__fill' })),
      el('span', { class: 'vital__note' }),
    );

  const update = (row, vital) => {
    const [label, bar, note] = row.children;
    setText(label, vital.label);
    setText(note, vital.note ?? '');
    bar.firstElementChild.style.setProperty('--value', vital.value.toFixed(3));
    for (const tone of TONES) setClass(row, `vital--${tone}`, vital.tone === tone);
  };

  return {
    refresh() {
      syncList(root, game.vitals(), { key: (vital) => vital.id, create, update });
    },
  };
}

/**
 * Everything carried or stockpiled, grouped; amounts flash when they change.
 * @param {HTMLElement} root
 * @param {import('../sim/index.js').Game} game
 */
export function createStores(root, game) {
  const createRow = () =>
    el(
      'div',
      { class: 'row' },
      el('span', { class: 'row__label' }),
      el('span', { class: 'row__value' }, el('span', {}), el('span', { class: 'row__cap' })),
    );

  const updateRow = (row, resource) => {
    const [label, value] = row.children;
    const [amount, cap] = value.children;
    const text = formatAmount(resource.amount);
    const changed = amount.textContent !== '' && amount.textContent !== text;

    setText(label, resource.label);
    setText(amount, text);
    row.title = resource.source ? `comes from: ${resource.source}` : '';
    setText(cap, resource.cap == null ? '' : ` / ${formatAmount(resource.cap)}`);

    if (changed) {
      row.classList.add('row--changed');
      setTimeout(() => row.classList.remove('row--changed'), CHANGE_FLASH_MS);
    }
  };

  const createGroup = ([, resources]) =>
    el(
      'section',
      { class: 'stores__group' },
      el('h2', { class: 'group__title' }, resources[0].groupLabel ?? resources[0].group),
      el('div', {}),
    );

  const updateGroup = (section, [, resources]) => {
    syncList(section.lastElementChild, resources, {
      key: (resource) => resource.id,
      create: createRow,
      update: updateRow,
    });
  };

  return {
    refresh() {
      const groups = [...groupBy(game.resources(), (resource) => resource.group)];
      syncList(root, groups, { key: ([id]) => id, create: createGroup, update: updateGroup });
    },
  };
}

/**
 * The voices at the fire: head count and a stepper per role.
 * Hidden until the first survivor arrives. A role that loses a worker the
 * player did not move (someone left, died or fell sick) flashes red.
 * @param {HTMLElement} root
 * @param {import('../sim/index.js').Game} game
 * @param {{ afterInput: () => void }} hooks
 */
export function createPeople(root, game, { afterInput, onPick }) {
  const count = el('span', { class: 'people__num' });
  const summary = el('p', { class: 'people__summary' });
  const roles = el('div', {});
  const names = el('div', { class: 'people__names', role: 'list' });
  const who = el(
    'details',
    { class: 'people__who' },
    el('summary', { class: 'people__who-toggle' }, 'who is here'),
    names,
  );
  root.append(
    el('h2', { class: 'group__title' }, 'the voices'),
    el('p', { class: 'people__head' }, count, el('span', { class: 'people__at' }, 'at the fire')),
    summary,
    roles,
    who,
  );

  /** One name per survivor; each opens their card. The mark beside it is how far they trust you. */
  const createName = (member) =>
    el(
      'button',
      {
        class: 'member',
        type: 'button',
        role: 'listitem',
        onClick: (event) => onPick?.(member.id, event.currentTarget),
      },
      el('span', { class: 'member__mark', 'aria-hidden': 'true' }),
      el('span', { class: 'member__name' }),
    );
  const updateName = (button, member) => {
    setText(button.lastElementChild, member.name);
    for (const label of ['devoted', 'loyal', 'steady', 'wary', 'bitter']) setClass(button, `member--${label}`, member.trustLabel === label);
    setClass(button, 'member--sick', member.sick);
    button.title = `${member.name}: ${member.role}, ${member.trustLabel}`;
    button.setAttribute('aria-label', `${member.name}, ${member.role}, ${member.trustLabel}. Open their card.`);
  };

  /** Last count seen per role, and roles the player just changed by hand. */
  const seen = new Map();
  const moved = new Set();

  const stepButton = (role, delta) =>
    el(
      'button',
      {
        class: 'stepper__btn',
        type: 'button',
        'aria-label': `${delta > 0 ? 'more' : 'fewer'} ${role.label}`,
        onClick: () => {
          moved.add(role.id);
          game.assign(role.id, delta);
          afterInput();
        },
      },
      delta > 0 ? '+' : '−',
    );

  const create = (role) =>
    el(
      'div',
      { class: 'role', title: role.hint ?? '' },
      el('span', { class: 'role__label' }, el('span', { class: 'role__name' }), el('span', { class: 'role__tool' })),
      el(
        'span',
        { class: 'stepper' },
        stepButton(role, -1),
        el('span', { class: 'stepper__count' }),
        stepButton(role, +1),
      ),
    );

  const update = (row, role, idle) => {
    const [label, stepper] = row.children;
    const [less, count, more] = stepper.children;
    const [name, tool] = label.children;
    setText(name, role.label);
    setText(tool, toolNote(role));
    setClass(tool, 'role__tool--short', Boolean(role.tool) && role.tool.have < role.count);
    setText(count, String(role.count));
    setDisabled(less, role.count <= 0);
    setDisabled(more, idle <= 0 || (role.max != null && role.count >= role.max));

    const before = seen.get(role.id);
    seen.set(role.id, role.count);
    if (before !== undefined && role.count < before && !moved.has(role.id)) {
      clearTimeout(row.lostTimer);
      row.classList.remove('role--lost');
      void row.offsetWidth; // restart the animation if it is already running
      row.classList.add('role--lost');
      row.lostTimer = setTimeout(() => row.classList.remove('role--lost'), LOST_FLASH_MS);
    }
  };

  return {
    refresh() {
      const people = game.people();
      root.hidden = !people;
      if (!people) return;

      const free = Math.max(0, people.cap - people.total);
      setText(count, String(people.total));
      const parts = [
        free === 0 ? 'no beds free' : `${free} ${free === 1 ? 'bed' : 'beds'} free`,
        `${people.idle} idle`,
      ];
      if (people.sick > 0) parts.push(`${people.sick} sick`);
      setText(summary, parts.join(' · '));
      setClass(summary, 'people__summary--full', free === 0);
      summary.title = free === 0 ? 'Newcomers need a bed. Build shelter to make room.' : '';
      root.title = people.names?.join(', ') ?? '';
      syncList(names, people.members ?? [], { key: (member) => member.id, create: createName, update: updateName });
      who.hidden = (people.members ?? []).length === 0;
      syncList(roles, people.roles, {
        key: (role) => role.id,
        create,
        update: (row, role) => update(row, role, people.idle),
      });
      moved.clear();
    },
  };
}
