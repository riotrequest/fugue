import { el } from './dom.js';

const MAX_LINES = 60;

/**
 * The running log. Newest line on top; older lines fade out below.
 * Rebuilds from the sim's persisted history on load, then follows 'log' events.
 * @param {HTMLElement} root
 * @param {import('../sim/index.js').Game} game
 */
export function createLog(root, game) {
  let lastDay = null;

  const push = (node) => {
    root.prepend(node);
    while (root.childElementCount > MAX_LINES) root.lastElementChild.remove();
  };

  const append = ({ text, tone = 'normal', day }) => {
    if (day != null && lastDay != null && day !== lastDay) {
      push(el('li', { class: 'log__line log__line--day' }, `day ${day}`));
    }
    if (day != null) lastDay = day;
    push(el('li', { class: `log__line log__line--${tone}` }, text));
  };

  root.replaceChildren();
  for (const entry of game.log().slice(-MAX_LINES)) append(entry);
  game.on('log', append);
}
