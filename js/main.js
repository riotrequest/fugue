/**
 * Fugue — bootstrap.
 *
 * Three independent layers meet here and nowhere else:
 *   sim/    pure, deterministic game state (no DOM)
 *   render/ the pixel-art clearing, drawn from the sim's SceneView
 *   audio/  synthesized ambience, driven by the same SceneView
 * ui/ diffs the sim's read models into the DOM.
 */
import { createAudio } from './audio/audio.js';
import { createScene } from './render/scene.js';
import { startOnline } from './online.js';
import { createGame } from './sim/index.js';
import * as storage from './storage.js';
import { byId } from './ui/dom.js';
import { createUI } from './ui/ui.js';

/** Fixed simulation step, in seconds. Keeps the sim deterministic across frame rates. */
const SIM_STEP = 0.1;
/** Longest frame we simulate; a backgrounded tab resumes instead of fast-forwarding. */
const MAX_FRAME = 0.25;
const UI_INTERVAL = 0.2;
const AUTOSAVE_INTERVAL = 10;

/** Sim sound cues that also get a visual accent in the scene. */
const SCENE_PULSES = {
  stoke: 'stoke',
  ignite: 'stoke',
  arrive: 'arrive',
  danger: 'danger',
  memory: 'memory',
  build: 'build',
};

const params = new URLSearchParams(location.search);
/** `?speed=8` fast-forwards time for playtesting. */
const speed = Math.max(1, Number(params.get('speed')) || 1);

const save = storage.loadSave();
const settings = storage.loadSettings();

const game = createGame({ save });
const scene = createScene(byId('scene'));
const audio = createAudio();
audio.setMuted(settings.muted);

let playing = false;
/** Held for this session only: never saved, so a reload returns to the title. */
let paused = false;
/** Time stands still while the guide is open. */
let helpOpen = false;

const persist = () => {
  if (playing) storage.writeSave(game.serialize());
};

const restart = () => {
  playing = false;
  storage.clearSave();
  location.reload();
};

const canPause = () => playing && !game.status().ended;

const setPaused = (next) => {
  if (next === paused || (next && !canPause())) return;
  paused = next;
  audio.setPaused(paused);
  if (paused) persist();
  ui.refresh();
};

const ui = createUI(game, {
  audio,
  hasSave: save != null,
  difficulty: settings.difficulty,
  onDifficulty: (difficulty) => storage.writeSettings({ ...storage.loadSettings(), difficulty }),
  onBegin: () => {
    playing = true;
    audio.unlock();
  },
  onRestart: restart,
  onMuteChange: (muted) => storage.writeSettings({ ...storage.loadSettings(), muted }),
  isPaused: () => paused,
  canPause,
  onPauseToggle: () => setPaused(!paused),
  helpSeen: storage.loadHelpSeen(),
  onHelpSeen: storage.writeHelpSeen,
  onHelpChange: (open) => {
    helpOpen = open;
  },
});

game.on('sfx', ({ name }) => {
  audio.sfx(name);
  if (SCENE_PULSES[name]) scene.pulse(SCENE_PULSES[name]);
});
game.on('ended', persist);

addEventListener('pagehide', persist);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) return;
  // Pausing saves, and the player comes back to a held game instead of a running one.
  if (canPause()) setPaused(true);
  else persist();
});

let last = performance.now();
let simDebt = 0;
let uiTimer = 0;
let saveTimer = 0;

function frame(now) {
  const dt = Math.min((now - last) / 1000, MAX_FRAME);
  last = now;

  if (playing && !paused && !helpOpen) {
    simDebt += dt * speed;
    while (simDebt >= SIM_STEP) {
      game.tick(SIM_STEP);
      simDebt -= SIM_STEP;
    }

    saveTimer += dt;
    if (saveTimer >= AUTOSAVE_INTERVAL) {
      saveTimer = 0;
      persist();
    }
  }

  const view = game.view();
  scene.update(view, dt);
  scene.render();
  audio.update(view, dt);

  uiTimer += dt;
  if (uiTimer >= UI_INTERVAL) {
    uiTimer = 0;
    ui.refresh();
  }

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
startOnline(byId('online'));
