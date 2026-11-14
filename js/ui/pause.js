import { byId, setText } from './dom.js';

const TOGGLE_KEYS = ['p', 'escape'];

/**
 * Pause: a toolbar toggle, the P and Escape keys, and a veil over the whole
 * page. The caller owns the paused flag; this part only renders it and asks
 * for it to change.
 * The veil also offers to save the game to a file, or load one in its place.
 * @param {{
 *   isPaused: () => boolean, canPause: () => boolean, onPauseToggle: () => void,
 *   saveFiles: ReturnType<typeof import('./savefile.js').createSaveFiles>,
 * }} hooks
 */
export function createPause({ isPaused, canPause, onPauseToggle, saveFiles }) {
  const overlay = byId('pause');
  const resume = byId('pause-resume');
  const button = byId('btn-pause');
  const files = saveFiles(false);
  byId('pause-actions').append(files.save, files.load, files.status);
  /** Everything under the veil. Made inert rather than hidden, so an open card survives the pause. */
  const covered = [byId('app'), byId('event'), byId('journal'), byId('help'), byId('survivor'), byId('notebook')];

  let shown = false;

  button.addEventListener('click', onPauseToggle);
  resume.addEventListener('click', onPauseToggle);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) onPauseToggle();
  });
  document.addEventListener('keydown', (event) => {
    // An overlay that used the key (the journal closing on Escape) has claimed it.
    if (event.defaultPrevented || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
    if (TOGGLE_KEYS.includes(event.key.toLowerCase())) onPauseToggle();
  });

  return {
    refresh() {
      const paused = isPaused();
      button.hidden = !canPause();
      if (paused === shown) return;
      shown = paused;

      setText(button, paused ? 'resume' : 'pause/save');
      button.setAttribute('aria-pressed', String(paused));
      overlay.hidden = !paused;
      if (paused) setText(files.status, '');
      for (const node of covered) node.inert = paused;
      // After `inert` is lifted, or the toolbar button could not take focus back.
      (paused ? resume : button).focus();
    },
  };
}
