import { byId, el, setText } from './dom.js';

/**
 * The survivor card: who someone is, what they do, how far they trust you,
 * who they are close to, and their own story if they have one. Opened from the
 * names in the voices panel. The world keeps moving while it is open, so it
 * redraws on every refresh.
 */

/** How someone's health reads in words. */
export function healthWord(health, sick) {
  if (sick) return health < 0.15 ? 'failing' : 'laid up';
  if (health >= 0.85) return 'strong';
  if (health >= 0.6) return 'tired';
  if (health >= 0.35) return 'worn thin';
  return 'failing';
}

/** How trust reads on the card, given its label. */
export const TRUST_WORDS = {
  devoted: 'would follow you anywhere',
  loyal: 'trusts you',
  steady: 'takes you as they find you',
  wary: 'is wary of you',
  bitter: 'has stopped trusting you',
};

/** "friend of Ines · partner of Bram · at odds with Dov". */
export function bondsLine(bonds) {
  if (bonds.length === 0) return 'keeps to themselves';
  return bonds.map((bond) => (bond.kind === 'rival' ? `${bond.word} ${bond.name}` : `${bond.word} of ${bond.name}`)).join(' · ');
}

/**
 * @param {import('../sim/index.js').Game} game
 * @param {{ isPaused: () => boolean }} hooks
 */
export function createSurvivors(game, { isPaused }) {
  const overlay = byId('survivor');
  const title = byId('survivor-title');
  const body = byId('survivor-body');
  let openId = null;
  let opener = null;
  let lastSignature = '';

  const meter = (value, tone) =>
    el('span', { class: `meter meter--${tone}` }, el('span', { class: 'meter__fill', style: `--value: ${value.toFixed(3)}` }));

  const render = (member) => {
    setText(title, member.name);
    const facts = [member.trait, member.role, `here since day ${member.sinceDay}`].filter(Boolean).join(' · ');
    const trustTone = member.trust >= 0.75 ? 'ok' : member.trust < 0.25 ? 'danger' : 'mid';
    const healthTone = member.sick || member.health < 0.35 ? 'danger' : member.health < 0.6 ? 'warn' : 'ok';
    body.replaceChildren(
      el('p', { class: 'survivor__facts' }, facts),
      el(
        'dl',
        { class: 'survivor__stats' },
        el('dt', {}, 'health'),
        el('dd', {}, meter(member.health, healthTone), el('span', {}, healthWord(member.health, member.sick))),
        el('dt', {}, 'trust'),
        el('dd', {}, meter(member.trust, trustTone), el('span', {}, `${member.trustLabel}: ${TRUST_WORDS[member.trustLabel]}`)),
        el('dt', {}, 'close to'),
        el('dd', {}, bondsLine(member.bonds)),
      ),
      member.story ? el('p', { class: 'survivor__story' }, member.story) : el('p', { class: 'survivor__story survivor__story--none' }, 'Nothing you know of yet, beyond what they have told you.'),
    );
  };

  const close = () => {
    overlay.hidden = true;
    openId = null;
    opener?.focus?.();
  };

  const refresh = () => {
    if (openId === null) return;
    const member = game.people()?.members.find((candidate) => candidate.id === openId);
    // They left, or died, while the card was open.
    if (!member) {
      close();
      return;
    }
    const signature = JSON.stringify({ ...member, health: Math.round(member.health * 50), trust: Math.round(member.trust * 50) });
    if (signature === lastSignature) return;
    lastSignature = signature;
    render(member);
  };

  byId('survivor-close').addEventListener('click', close);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || overlay.hidden || isPaused()) return;
    close();
    event.preventDefault();
  });

  return {
    /** @param {number} id @param {HTMLElement} [from]  focus returns here on close */
    open(id, from) {
      openId = id;
      opener = from ?? null;
      lastSignature = '';
      overlay.hidden = false;
      refresh();
      byId('survivor-close').focus();
    },
    isOpen: () => openId !== null,
    refresh,
  };
}
