import { createActions } from './actions.js';
import { byId, setClass, setText } from './dom.js';
import { createLog } from './journal.js';
import { createCurtain, createEventCard, createJournal } from './overlays.js';
import { createHelp } from './help.js';
import { createSurvivors } from './survivors.js';
import { createNotebook } from './notebook.js';
import { createPause } from './pause.js';
import { createPeople, createStores, createVitals } from './side.js';

/** Clock, chapter, weather and the caption under the scene. */
function createHud(game) {
  const chapter = byId('hud-chapter');
  const clock = byId('hud-clock');
  const season = byId('hud-season');
  const weather = byId('hud-weather');
  const fire = byId('hud-fire');

  return {
    refresh() {
      const status = game.status();
      setText(chapter, status.chapter ?? '');
      setText(clock, status.clock ?? '');
      setText(season, status.season ?? '');
      setClass(season, 'hud--warn', (status.season ?? '').startsWith('deep winter'));
      setText(weather, status.weatherLabel ?? '');
      setText(fire, status.fireLabel ?? '');
    },
  };
}

/** Sound toggle and restart, in the top bar. */
function bindToolbar({ audio, onMuteChange, onRestart }) {
  const mute = byId('btn-mute');
  const paint = () => {
    const muted = audio.isMuted();
    setText(mute, muted ? 'sound off' : 'sound on');
    mute.setAttribute('aria-pressed', String(muted));
  };

  mute.addEventListener('click', () => {
    audio.setMuted(!audio.isMuted());
    onMuteChange(audio.isMuted());
    paint();
  });
  paint();

  const restart = byId('btn-restart');
  let confirmTimer = 0;
  restart.addEventListener('click', () => {
    if (confirmTimer) {
      onRestart();
      return;
    }
    // Two-step confirm without a blocking dialog: the label asks, a second click answers.
    setText(restart, 'let it all go?');
    confirmTimer = setTimeout(() => {
      confirmTimer = 0;
      setText(restart, 'begin again');
    }, 3000);
  });
}

/**
 * Compose the interface. Every part exposes `refresh()`, which diffs the sim's
 * read models into the DOM; the caller polls it a few times a second and the
 * parts call it right after any player input so clicks feel instant.
 *
 * @param {import('../sim/index.js').Game} game
 * @param {{
 *   audio: ReturnType<typeof import('../audio/audio.js').createAudio>,
 *   hasSave: boolean,
 *   difficulty: string,
 *   onDifficulty: (id: string) => void,
 *   onBegin: () => void,
 *   onRestart: () => void,
 *   onMuteChange: (muted: boolean) => void,
 *   isPaused: () => boolean,
 *   canPause: () => boolean,
 *   onPauseToggle: () => void,
 *   helpSeen: string[],
 *   onHelpSeen: (ids: string[]) => void,
 *   onHelpChange: (open: boolean) => void,
 * }} hooks
 */
export function createUI(
  game,
  {
    audio, hasSave, difficulty, onDifficulty, onBegin, onRestart, onMuteChange, isPaused, canPause, onPauseToggle,
    helpSeen, onHelpSeen, onHelpChange,
  },
) {
  const parts = [];
  const refresh = () => {
    for (const part of parts) part.refresh();
  };
  // Created first so its Escape handler runs before the pause's, and so the
  // title screen can open it. While it is open, cards and actions ignore keys.
  const help = createHelp(game, { isPaused, seen: helpSeen, onSeen: onHelpSeen, onOpenChange: onHelpChange });
  const hooks = { afterInput: refresh, isPaused: () => isPaused() || help.isOpen() };

  const survivors = createSurvivors(game, hooks);
  createLog(byId('log'), game);
  bindToolbar({ audio, onMuteChange, onRestart });

  parts.push(
    help,
    createHud(game),
    createVitals(byId('vitals'), game),
    createStores(byId('stores'), game),
    createPeople(byId('people'), game, { ...hooks, onPick: survivors.open }),
    survivors,
    createNotebook(game, hooks),
    createActions(
      { quick: byId('actions-quick'), tabs: byId('actions-tabs'), board: byId('actions'), hint: byId('hint') },
      game,
      hooks,
    ),
    createEventCard(game, hooks),
    createJournal(game, hooks),
    createCurtain(game, { hasSave, difficulty, onDifficulty, onBegin, onRestart, onHelp: help.open }),
    // Last, so its Escape handler runs after any overlay that claims the key.
    createPause({ isPaused, canPause, onPauseToggle }),
  );

  refresh();
  return { refresh };
}
