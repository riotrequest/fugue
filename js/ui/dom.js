/**
 * Minimal DOM helpers. The UI is small enough that a keyed list reconciler
 * and an element factory replace a framework.
 */

/**
 * Create an element. `props` keys: `class`, `dataset`, `on<Event>` listeners,
 * otherwise DOM properties (falling back to attributes).
 * @param {string} tag
 * @param {Record<string, unknown>} [props]
 * @param {...(Node|string|null|false|undefined|Array<Node|string|null|false|undefined>)} children
 * @returns {HTMLElement}
 */
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;
    if (key === 'class') node.className = String(value);
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key.startsWith('on')) node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key in node) node[key] = value;
    else node.setAttribute(key, String(value));
  }
  node.append(...children.flat().filter((child) => child != null && child !== false));
  return node;
}

/** @param {string} id @returns {HTMLElement} */
export function byId(id) {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing #${id} in index.html`);
  return node;
}

/** Write text only when it changed, so polling never churns the DOM. */
export function setText(node, text) {
  if (node.textContent !== text) node.textContent = text;
}

/** Toggle a class only when needed. */
export function setClass(node, name, on) {
  if (node.classList.contains(name) !== on) node.classList.toggle(name, on);
}

/** Buttons stay focusable and hoverable while unavailable, so hints still show. */
export function setDisabled(button, disabled) {
  const value = String(disabled);
  if (button.getAttribute('aria-disabled') !== value) button.setAttribute('aria-disabled', value);
}

/** Split sim prose (paragraphs separated by blank lines) into <p> nodes. */
export function paragraphs(text) {
  return String(text ?? '')
    .split(/\n{2,}/)
    .filter(Boolean)
    .map((block) => el('p', {}, block));
}

/**
 * Keyed reconcile of `parent`'s children against `items`: reuses nodes by key,
 * creates missing ones, removes stale ones, and fixes order with minimal moves.
 * @template T
 * @param {HTMLElement} parent
 * @param {T[]} items
 * @param {{ key: (item: T) => string|number, create: (item: T) => HTMLElement, update: (node: HTMLElement, item: T) => void }} spec
 */
export function syncList(parent, items, { key, create, update }) {
  const stale = new Map();
  for (const child of parent.children) stale.set(child.dataset.key, child);

  let cursor = parent.firstElementChild;
  for (const item of items) {
    const id = String(key(item));
    let node = stale.get(id);
    if (node) {
      stale.delete(id);
    } else {
      node = create(item);
      node.dataset.key = id;
    }
    update(node, item);
    if (node === cursor) cursor = cursor.nextElementSibling;
    else parent.insertBefore(node, cursor);
  }
  for (const node of stale.values()) node.remove();
}

/** Group items by a key while preserving first-seen order. */
export function groupBy(items, keyOf) {
  const groups = new Map();
  for (const item of items) {
    const id = keyOf(item);
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(item);
  }
  return groups;
}
