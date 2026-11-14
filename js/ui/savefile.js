import { decodeSaveFile, encodeSaveFile, MAX_SAVE_BYTES, saveFileName } from '../savefile.js';
import { el, setText } from './dom.js';

const CONFIRM_MS = 3000;
const SAVE_LABEL = 'save to a file';
const LOAD_LABEL = 'load from a file';

/** Hands the player a file, without a server: a blob behind a throwaway link. */
function download(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = el('a', { href: url, download: name, hidden: true });
  document.body.append(link);
  link.click();
  link.remove();
  // Some browsers read the blob after click() returns.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * Saving to and loading from a file. One hidden file picker serves every panel
 * that offers the buttons; whichever panel opened it hears how it went.
 *
 * @param {{
 *   serialize: () => object,
 *   hasGame: () => boolean,
 *   onLoad: (save: object) => boolean,
 * }} hooks `hasGame` says whether loading would replace a game worth keeping;
 *   `onLoad` stores the save and reloads into it, or returns false if it could not be stored.
 * @returns {(quiet?: boolean) => { save: HTMLElement, load: HTMLElement, status: HTMLElement }}
 */
export function createSaveFiles({ serialize, hasGame, onLoad }) {
  const picker = el('input', { type: 'file', accept: '.json,application/json', hidden: true });
  document.body.append(picker);
  let report = () => {};

  picker.addEventListener('change', async () => {
    const file = picker.files?.[0];
    picker.value = '';
    if (!file) return;
    let save = null;
    if (file.size <= MAX_SAVE_BYTES) {
      try {
        save = decodeSaveFile(await file.text());
      } catch {
        save = null;
      }
    }
    if (!save) report('that file is not a save this fire remembers.', 'warn');
    else if (!onLoad(save)) report('this browser will not hold a save. it may be in private mode.', 'warn');
  });

  return (quiet = true) => {
    const status = el('p', { class: 'savefile__status', role: 'status' });
    const say = (text, tone = '') => {
      setText(status, text);
      status.dataset.tone = tone;
    };
    const button = (label, onClick) =>
      el('button', { class: quiet ? 'choice choice--quiet' : 'choice', type: 'button', onClick }, label);

    const save = button(SAVE_LABEL, () => {
      const data = serialize();
      download(saveFileName(data), encodeSaveFile(data));
      say('saved. keep the file somewhere safe.');
    });

    let confirmTimer = 0;
    const settle = () => {
      clearTimeout(confirmTimer);
      confirmTimer = 0;
      setText(load, LOAD_LABEL);
    };
    const load = button(LOAD_LABEL, () => {
      // Two-step confirm, as "begin again" does: the label asks, a second click answers.
      if (hasGame() && !confirmTimer) {
        setText(load, 'replace this game?');
        confirmTimer = setTimeout(settle, CONFIRM_MS);
        return;
      }
      settle();
      say('');
      report = say;
      picker.click();
    });

    return { save, load, status };
  };
}
