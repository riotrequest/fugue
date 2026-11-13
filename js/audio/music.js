/**
 * The fugue. A short modal subject is stated by a single voice when the
 * player is alone; every survivor who joins the fire adds a voice that answers
 * it — at the fourth below, the octave above, the octave below — entering one
 * after another. Phrases are separated by long silences, and each is varied
 * (subject, mode, tempo, inversion, stretto, fragment) so an hour of play
 * never hears quite the same thing twice.
 */

import { chime } from './oneshot.js';
import { createEase, lerp, pick, rand } from './util.js';

/** D4. All pitches are scale degrees above or below this tonic. */
const TONIC_HZ = 293.66;
const DEGREES_PER_OCTAVE = 7;
/** Semitone offsets of each scale degree. Dorian is the home mode. */
const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const AEOLIAN = [0, 2, 3, 5, 7, 8, 10];
const AEOLIAN_CHANCE = 0.3;

/**
 * A melodic line: [scale degree, length in beats] pairs. A null degree rests.
 * @typedef {ReadonlyArray<readonly [number|null, number]>} Line
 */

/** @type {ReadonlyArray<Line>} */
const SUBJECTS = [
  [[0, 2], [4, 2], [2, 1], [1, 1], [0, 1], [-1, 1], [0, 4]],
  [[0, 3], [2, 1], [3, 2], [4, 3], [3, 1], [1, 2], [0, 4]],
  [[4, 2], [5, 1], [4, 1], [2, 2], [0, 2], [1, 2], [0, 4]],
  [[0, 2], [1, 2], [2, 3], [-1, 1], [0, 4]],
];

/**
 * Long tones a voice holds, quietly, while the next voice answers it.
 * @type {Line}
 */
const COUNTERSUBJECT = [[null, 2], [2, 4], [1, 3], [0, 4]];
const COUNTERSUBJECT_LEVEL = 0.6;

/** Where each successive voice enters: transposition in scale degrees, and pan. */
const ENTRIES = [
  { degree: 0, pan: -0.12 },
  { degree: -3, pan: 0.3 },
  { degree: 7, pan: -0.35 },
  { degree: -7, pan: 0.18 },
];

/** Seconds per beat, chosen per phrase. */
const BEAT_SECONDS = [0.85, 1.15];
/** Beats of air between one voice finishing the subject and the next entering. */
const ENTRY_BREATHS = [0, 1, 2];
/** Chance that voices instead overlap, entering halfway through the subject. */
const STRETTO_CHANCE = 0.2;
const INVERSION_CHANCE = 0.2;
/** Chance of a brief echo — the subject's opening notes, in at most two voices. */
const FRAGMENT_CHANCE = 0.22;
const FRAGMENT_NOTES = 4;
const FRAGMENT_VOICES = 2;

/** Seconds of silence after a phrase, by day and by night. */
const REST_SECONDS_DAY = [50, 110];
const REST_SECONDS_NIGHT = [28, 65];
/** Seconds from unlock (or from a new story) to the first statement. */
const FIRST_ENTRY_SECONDS = 8;
/** The music holds its breath while danger is this close. */
const THREAT_HUSH = 0.7;

const NOTE_PEAK = 0.065;
const NOTE_ATTACK = 0.012;
/** Notes ring past their written length. */
const NOTE_DECAY_PER_BEAT = 1.7;
const NOTE_MIN_DECAY = 2.2;
const NOTE_REVERB = 0.55;
/** Random spread in note level (as a factor) and timing (seconds). */
const NOTE_LEVEL_SPREAD = [0.78, 1];
const NOTE_TIMING_SPREAD = 0.018;
/** Low notes are lifted, high notes softened, by at most this factor. */
const LOUDNESS_COMPENSATION_LIMIT = 1.4;

/** Bus level by day and by night, and how slowly it moves between them. */
const MUSIC_LEVEL = [0.55, 1];
const MUSIC_TIME_CONSTANT = 4;

/** Notes are handed to the audio clock this far ahead of their time... */
const SCHEDULE_AHEAD_SECONDS = 0.6;
/** ...phrases begin this far ahead, and notes later than this are dropped. */
const LEAD_IN_SECONDS = 0.7;
const STALE_SECONDS = 1;

/**
 * @typedef {Object} Note
 * @property {number} time  AudioContext time
 * @property {number} freq
 * @property {number} decay
 * @property {number} peak
 * @property {number} pan
 */

/**
 * @typedef {Object} Voicing
 * @property {number} start     AudioContext time of the line's first beat
 * @property {number} beat      seconds per beat
 * @property {number[]} mode
 * @property {number} degree    transposition in scale degrees
 * @property {number} pan
 * @property {number} level     0..1 relative to NOTE_PEAK
 * @property {number} maxBeats  the line is cut off after this many beats
 */

/**
 * @param {number} degree scale degrees from the tonic; may be negative
 * @param {number[]} mode
 */
function degreeToHz(degree, mode) {
  const octave = Math.floor(degree / DEGREES_PER_OCTAVE);
  const step = degree - octave * DEGREES_PER_OCTAVE;
  return TONIC_HZ * 2 ** (octave + mode[step] / 12);
}

/** @param {Line} line */
const beatsIn = (line) => line.reduce((total, [, length]) => total + length, 0);

/**
 * Appends one voice's reading of a line to `notes`.
 * @param {Note[]} notes
 * @param {Line} line
 * @param {Voicing} voicing
 */
function addLine(notes, line, voicing) {
  let beats = 0;
  for (const [degree, length] of line) {
    if (beats >= voicing.maxBeats) return;
    if (degree !== null) {
      const freq = degreeToHz(voicing.degree + degree, voicing.mode);
      const compensation = Math.min(LOUDNESS_COMPENSATION_LIMIT, Math.sqrt(TONIC_HZ / freq));
      notes.push({
        time: voicing.start + beats * voicing.beat + rand(-NOTE_TIMING_SPREAD, NOTE_TIMING_SPREAD),
        freq,
        decay: Math.max(NOTE_MIN_DECAY, length * voicing.beat * NOTE_DECAY_PER_BEAT),
        peak: NOTE_PEAK * voicing.level * compensation * rand(NOTE_LEVEL_SPREAD[0], NOTE_LEVEL_SPREAD[1]),
        pan: voicing.pan,
      });
    }
    beats += length;
  }
}

/**
 * Composes one exposition: each voice states the subject in turn, the voice
 * before it accompanying with the countersubject.
 * @param {number} voiceCount   1..ENTRIES.length
 * @param {number} start        AudioContext time of the first note
 * @param {Line|null} previous  the last phrase's subject, not to be repeated
 * @returns {{ notes: Note[], end: number, subject: Line }} notes in time order
 */
function composePhrase(voiceCount, start, previous) {
  const subject = pick(SUBJECTS.filter((candidate) => candidate !== previous));
  const fragment = Math.random() < FRAGMENT_CHANCE;
  const voices = fragment ? Math.min(voiceCount, FRAGMENT_VOICES) : voiceCount;
  const upright = fragment ? subject.slice(0, FRAGMENT_NOTES) : subject;
  const line = Math.random() < INVERSION_CHANCE ? upright.map(([degree, length]) => [-degree, length]) : upright;

  const mode = Math.random() < AEOLIAN_CHANCE ? AEOLIAN : DORIAN;
  const beat = rand(BEAT_SECONDS[0], BEAT_SECONDS[1]);
  const span = beatsIn(line);
  const stretto = voices > 1 && Math.random() < STRETTO_CHANCE;
  const entryGap = stretto ? Math.ceil(span / 2) : span + pick(ENTRY_BREATHS);

  /** @type {Note[]} */
  const notes = [];
  for (let voice = 0; voice < voices; voice++) {
    const { degree, pan } = ENTRIES[voice];
    const voicing = { start: start + voice * entryGap * beat, beat, mode, degree, pan, level: 1, maxBeats: Infinity };
    addLine(notes, line, voicing);

    const answered = voice < voices - 1;
    if (answered && !stretto && !fragment) {
      addLine(notes, COUNTERSUBJECT, {
        ...voicing,
        start: voicing.start + entryGap * beat,
        level: COUNTERSUBJECT_LEVEL,
        maxBeats: span,
      });
    }
  }

  notes.sort((a, b) => a.time - b.time);
  return { notes, end: start + ((voices - 1) * entryGap + span) * beat, subject };
}

/**
 * @param {import('./engine.js').Engine} engine
 * @returns {import('./beds/fire.js').Bed}
 */
export function createMusic(engine) {
  const { ctx } = engine;
  const bus = ctx.createGain();
  bus.gain.value = MUSIC_LEVEL[0];
  bus.connect(engine.input);
  const easeLevel = createEase(bus.gain, MUSIC_TIME_CONSTANT);

  /** @type {Note[]} */
  let pending = [];
  /** @type {Line|null} */
  let lastSubject = null;
  let nextPhraseAt = ctx.currentTime + FIRST_ENTRY_SECONDS;

  return {
    update({ night, people, threat, ended }, now) {
      easeLevel(lerp(MUSIC_LEVEL[0], MUSIC_LEVEL[1], night), now);

      if (ended) {
        // Let sounding notes ring out under the final fade; state nothing new.
        pending = [];
        nextPhraseAt = now + FIRST_ENTRY_SECONDS;
        return;
      }

      if (pending.length === 0 && now >= nextPhraseAt && threat < THREAT_HUSH) {
        const voices = Math.min(1 + people, ENTRIES.length);
        const phrase = composePhrase(voices, now + LEAD_IN_SECONDS, lastSubject);
        const rest = lerp(
          rand(REST_SECONDS_DAY[0], REST_SECONDS_DAY[1]),
          rand(REST_SECONDS_NIGHT[0], REST_SECONDS_NIGHT[1]),
          night,
        );
        pending = phrase.notes;
        lastSubject = phrase.subject;
        nextPhraseAt = phrase.end + rest;
      }

      while (pending.length > 0 && pending[0].time < now + SCHEDULE_AHEAD_SECONDS) {
        const note = pending.shift();
        if (note.time < now - STALE_SECONDS) continue;
        chime(engine, bus, {
          at: note.time,
          freq: note.freq,
          attack: NOTE_ATTACK,
          decay: note.decay,
          peak: note.peak,
          pan: note.pan,
          reverb: NOTE_REVERB,
        });
      }
    },
  };
}
