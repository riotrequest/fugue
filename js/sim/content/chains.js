import { indexById } from '../util.js';

/**
 * Stories told over several days (systems/chains.js). Each chain is a set of
 * ordinary events that hand on to one another: a choice ends with
 * `{ chain: { id, stage, wait } }` to carry the story on after `wait` seconds,
 * or with `{ chainEnd: id }` to close it. Every choice of a chain event does one
 * or the other (a content test makes sure), so no story is left hanging.
 *
 * Personal arcs are chains about one survivor (`arc: true`): while one runs, the
 * survivor's card shows `note`, and afterwards `doneNote`.
 *
 * @typedef {object} ChainDef
 * @property {string} id
 * @property {string} title       for the journal and the tests
 * @property {string} start       the opening event
 * @property {object} [when]      when it may begin
 * @property {string} [cast]      the opening event's cast kind, if it is about someone
 * @property {boolean} [arc]      a personal story: the cast's own
 * @property {number} [weight]
 * @property {string} [note]      the survivor card's line while it runs
 * @property {string} [doneNote]  and afterwards
 * @property {string} [lost]      logged if its person is gone when the next stage comes
 * @property {string} [record]    chronicled when it ends
 * @property {number} [patience]  seconds a stage may wait on its `when` before the story lapses
 * @property {string} [lapsed]    logged when it does
 */

const DAY = 240;
const soon = [DAY * 0.6, DAY * 1.2];
const later = [DAY * 1.2, DAY * 2.2];

const go = (id, stage, wait = soon) => ({ chain: { id, stage, wait } });
const end = (id) => ({ chainEnd: id });

/** @type {ChainDef[]} */
export const CHAINS = [
  // The world.
  {
    id: 'far-smoke',
    title: 'Smoke on the ridge',
    start: 'far-smoke-1',
    when: { chapterMin: 2, popMin: 1 },
  },
  {
    id: 'the-dog',
    title: 'The dog',
    start: 'the-dog-1',
    when: { popMin: 1, has: { meat: 1 } },
    record: 'A dog came to the fire.',
  },
  {
    id: 'wolves',
    title: 'Wolves',
    start: 'wolves-1',
    when: { built: ['snares'], phase: ['night'] },
    record: 'The wolves of the valley were dealt with.',
  },
  {
    id: 'mirror',
    title: 'A flash on the hill',
    start: 'mirror-1',
    when: { chapterMin: 3, popMin: 2 },
  },
  {
    id: 'cough',
    title: 'The cough',
    start: 'cough-1',
    cast: 'survivor',
    when: { popMin: 4 },
    lost: 'The cough went with {name}, in the end. Nobody else catches it.',
    record: 'A cough went through the camp.',
  },
  {
    id: 'meltwater',
    title: 'Meltwater',
    start: 'meltwater-1',
    when: { season: ['spring'] },
    record: 'The spring flood came up to the edge of the camp.',
  },
  {
    id: 'hermit',
    title: 'The hermit',
    start: 'hermit-1',
    when: { dayMin: 5, popMin: 1 },
  },
  {
    id: 'boots',
    title: 'Many boots',
    start: 'boots-1',
    when: { chapterMin: 3, popMin: 4 },
    weight: 0.8,
    record: 'Strangers came to the edge of the camp in strength.',
  },

  // Personal arcs.
  {
    id: 'letter',
    title: 'The letter',
    start: 'letter-1',
    cast: 'arcless',
    arc: true,
    when: { popMin: 2 },
    note: 'Carries a letter they have never sent.',
    doneNote: 'Has made their peace with the letter.',
    lost: 'The letter {name} carried is still in their coat. Nobody opens it.',
    record: '{name} let go of an old letter.',
  },
  {
    id: 'carving',
    title: 'The carving',
    start: 'carving-1',
    cast: 'arcless',
    arc: true,
    when: { popMin: 3 },
    note: 'Is making something they will not show anyone yet.',
    doneNote: 'Made the camp a gift with their own hands.',
    lost: 'Among {name}’s things there is a half-carved piece of pine. Nobody can tell what it was going to be.',
    record: '{name} carved something for the camp.',
  },
  {
    id: 'old-wound',
    title: 'The old wound',
    start: 'old-wound-1',
    cast: 'arcless',
    arc: true,
    when: { popMin: 2 },
    note: 'Hides a limp, and an old wound under it.',
    doneNote: 'The old wound is behind them now, one way or another.',
    lost: 'Whatever {name} was hiding under that bandage, they took it with them.',
    record: '{name} stopped hiding an old wound.',
  },
  {
    id: 'lessons',
    title: 'Lessons',
    start: 'lessons-1',
    cast: 'arcless',
    arc: true,
    when: { popMin: 4 },
    note: 'Used to teach, before. Might again.',
    doneNote: 'Teaches the others in the evenings.',
    lost: 'The evening lessons stop with {name}.',
    record: '{name} began teaching in the evenings.',
  },
  {
    id: 'ring',
    title: 'The ring',
    start: 'ring-1',
    cast: 'arcless',
    arc: true,
    when: { flags: ['loc-suburb'], popMin: 2 },
    note: 'Asked you to look for their mother’s ring in the drowned suburb.',
    doneNote: 'Wears their mother’s ring on a ribbon round their neck.',
    lost: 'Nobody else knows which house {name} meant. The ring stays where it is.',
    record: '{name} got their mother’s ring back.',
    patience: DAY * 8,
    lapsed: '{name} has stopped asking about the ring. You did not go, and they have noticed.',
  },
  {
    id: 'dawn-prayer',
    title: 'At first light',
    start: 'dawn-prayer-1',
    cast: 'arcless',
    arc: true,
    when: { popMin: 3 },
    note: 'Keeps a quiet ritual at first light.',
    doneNote: 'Their dawn ritual belongs to the whole camp now.',
    lost: 'Nobody keeps the dawn ritual now that {name} is gone. Some mornings, someone almost does.',
    record: '{name}’s dawn ritual became the camp’s.',
  },
];

export const CHAIN_BY_ID = indexById(CHAINS);

/** @type {import('./events.js').EventDef[]} */
export const CHAIN_EVENTS = [
  // ── Smoke on the ridge ──────────────────────────────────────────────
  {
    id: 'far-smoke-1',
    title: 'Smoke on the ridge',
    text: [
      'Above the far ridge, against the grey, a smudge of smoke. Not a forest fire: too small, too steady. Somebody up there is keeping a fire the way you keep yours.',
    ],
    choices: [
      {
        id: 'watch',
        label: 'watch it for a day or two',
        effects: [{ log: 'You mark the place against a notch in the hills, and keep watching.' }, go('far-smoke', 'far-smoke-2', later)],
      },
      {
        id: 'ignore',
        label: 'it is not your business',
        effects: [{ log: 'You turn your back on it. By evening it is gone, or you have stopped looking.' }, end('far-smoke')],
      },
    ],
  },
  {
    id: 'far-smoke-2',
    title: 'The smoke has stopped',
    tone: 'warn',
    text: [
      'For three days the smoke has gone up at the same hours. Today it did not. The notch in the hills is empty sky.',
    ],
    choices: [
      {
        id: 'go-look',
        label: 'walk over and look',
        hint: 'most of a day, and cold',
        effects: [{ vital: { warmth: -0.15, food: -0.1 } }, { log: 'You go. It is further than it looked.' }, { next: 'far-smoke-3' }],
      },
      {
        id: 'signal',
        label: 'build the fire high, so they can see you',
        cost: { wood: 4 },
        effects: [{ fuel: 4 }, { log: 'You feed the fire until it roars, and wait.' }, go('far-smoke', 'far-smoke-4', soon)],
      },
      {
        id: 'leave',
        label: 'let it go',
        effects: [{ log: 'Whoever they were, whatever happened, you will never know.' }, end('far-smoke')],
      },
    ],
  },
  {
    id: 'far-smoke-3',
    title: 'A cold camp',
    text: [
      'A ring of stones on the ridge, ash in it still faintly warm. A tarp torn loose and flapping. Bootprints going downhill, two sets, one dragging.',
      'Under the tarp, someone left in a hurry: a sack, half full.',
    ],
    choices: [
      {
        id: 'take',
        label: 'take the sack',
        effects: [{ grant: { rations: [2, 4], cloth: [1, 3], medicine: [0, 1] } }, { log: 'You carry it home. It feels like stealing from people who are not there to stop you.' }, end('far-smoke')],
      },
      {
        id: 'follow',
        label: 'follow the bootprints',
        effects: [{ vital: { warmth: -0.1 } }, { log: 'The tracks go downhill, toward your side of the valley. You lose them in the creek.' }, go('far-smoke', 'far-smoke-4', soon)],
      },
    ],
  },
  {
    id: 'far-smoke-4',
    title: 'Out of the trees',
    cast: 'newcomer',
    text: [
      'Two figures come out of the trees at dusk, one holding the other up. The one walking is {name}. The one being held does not lift their head.',
      '“We saw your fire,” {name} says. “Please.”',
    ],
    choices: [
      {
        id: 'take-in',
        label: 'take them in',
        when: { room: true },
        effects: [
          { arrive: true, health: 0.55 },
          { sfx: 'arrive' },
          { log: '{name} sits down by the fire. The other one does not live till morning; {name} buries them alone, at first light, and then comes back and asks what needs doing.', tone: 'warn' },
          end('far-smoke'),
        ],
      },
      {
        id: 'feed-and-send',
        label: 'feed them and send them on',
        cost: { rations: 2 },
        effects: [{ log: '{name} eats, thanks you, and helps the other one up. You watch them go down the valley.' }, end('far-smoke')],
      },
      {
        id: 'turn-away',
        label: 'there is no room',
        effects: [{ trust: { who: 'all', delta: -0.04 } }, { log: '{name} does not argue. The others watch them go and say nothing to you for the rest of the evening.', tone: 'warn' }, end('far-smoke')],
      },
    ],
  },

  // ── The dog ─────────────────────────────────────────────────────────
  {
    id: 'the-dog-1',
    title: 'Ribs',
    text: [
      'A dog at the edge of the light: grey, rangy, nothing but ribs. It does not come closer and does not leave. It is watching the meat.',
    ],
    choices: [
      {
        id: 'throw-meat',
        label: 'throw it a scrap',
        cost: { meat: 1 },
        effects: [{ log: 'It snatches the meat out of the air and is gone. But it was not afraid.' }, go('the-dog', 'the-dog-2', soon)],
      },
      {
        id: 'drive-off',
        label: 'drive it off',
        effects: [{ log: 'A thrown stick and it is gone, without a sound.' }, end('the-dog')],
      },
    ],
  },
  {
    id: 'the-dog-2',
    title: 'Back again',
    text: [
      'The dog is back. This time it lies down just inside the light, head on its paws, and watches you work.',
    ],
    choices: [
      {
        id: 'name-it',
        label: 'call it over',
        cost: { meat: 1 },
        effects: [
          { flag: 'dog' },
          { trust: { who: 'all', delta: 0.04 } },
          { log: 'It takes the meat from your hand, very gently, and then lies down against your leg as if it had always lived here.', tone: 'good' },
          go('the-dog', 'the-dog-3', later),
        ],
      },
      {
        id: 'leave-be',
        label: 'let it be',
        effects: [{ log: 'The dog watches a while longer. In the morning it is gone, and it does not come back.' }, end('the-dog')],
      },
    ],
  },
  {
    id: 'the-dog-3',
    title: 'The dog growls',
    tone: 'warn',
    when: { phase: ['night', 'dusk'] },
    text: [
      'In the middle of the night the dog is on its feet, hackles up, growling at a piece of dark that looks like every other piece of dark.',
    ],
    choices: [
      {
        id: 'trust-dog',
        label: 'wake the camp and build up the fire',
        cost: { wood: 2 },
        effects: [
          { fuel: 2 },
          { threat: 0 },
          { log: 'Whatever it was, it does not come. The dog lies down again, satisfied, and goes to sleep before you do.', tone: 'good' },
          end('the-dog'),
        ],
      },
      {
        id: 'hush',
        label: 'hush it',
        effects: [{ threat: 0.5 }, { log: 'The dog stops growling, but it does not lie down. Neither, after a while, do you.', tone: 'warn' }, end('the-dog')],
      },
    ],
  },

  // ── Wolves ──────────────────────────────────────────────────────────
  {
    id: 'wolves-1',
    title: 'Howling',
    tone: 'warn',
    text: [
      'Wolves, somewhere up the valley. Not one: several, answering each other. It goes on a long time.',
    ],
    choices: [
      {
        id: 'note',
        label: 'keep the fire high tonight',
        cost: { wood: 2 },
        effects: [{ fuel: 2 }, { log: 'The howling moves away toward morning.' }, go('wolves', 'wolves-2', later)],
      },
      {
        id: 'sleep',
        label: 'they are far off',
        effects: [{ log: 'They are far off. You sleep, more or less.' }, go('wolves', 'wolves-2', soon)],
      },
    ],
  },
  {
    id: 'wolves-2',
    title: 'Robbed snares',
    tone: 'warn',
    text: [
      'Every snare on the line sprung and empty, the wire bitten through on two of them. Big prints in the snow all round, and blood, and fur that was a hare.',
      'They have found an easy meal. They will be back for it.',
    ],
    choices: [
      {
        id: 'move-line',
        label: 'move the snare line further off',
        cost: { wire: 1 },
        effects: [{ log: 'You move the line across the creek. It costs a day and some wire.' }, end('wolves')],
      },
      {
        id: 'hunt-den',
        label: 'find the den',
        tools: ['spear'],
        effects: [{ log: 'You go armed, and you take someone with you.' }, go('wolves', 'wolves-3', soon)],
      },
      {
        id: 'bait',
        label: 'leave them a share',
        cost: { meat: 2 },
        effects: [{ log: 'You leave meat far up the valley, well away from camp. A bargain of sorts.' }, go('wolves', 'wolves-3', later)],
      },
      {
        id: 'give-up-line',
        label: 'give up the snare line for now',
        effects: [{ take: { meat: 1 } }, { log: 'You pull the snares in. The wolves will have to find their meals somewhere else, and so will you.' }, end('wolves')],
      },
    ],
  },
  {
    id: 'wolves-3',
    title: 'The den',
    tone: 'danger',
    text: [
      'A hollow under a fallen spruce, the snow trodden flat around it. The old wolf comes out to meet you and stands between you and the hollow, head low.',
      'Behind it, in the dark, small shapes moving.',
    ],
    choices: [
      {
        id: 'kill',
        label: 'kill the old wolf',
        tools: ['spear'],
        effects: [
          {
            roll: 0.6,
            pass: [{ grant: { meat: 4, hide: 2 } }, { threat: 0 }, { log: 'It is quick, and terrible, and the pack scatters. You carry home meat and a heavy grey hide.', tone: 'good' }],
            fail: [{ vital: { health: -0.25 } }, { log: 'It is not quick. You come home torn and empty-handed, and the howling that night is very close.', tone: 'danger' }],
          },
          end('wolves'),
        ],
      },
      {
        id: 'back-away',
        label: 'back away',
        effects: [{ log: 'You back away slowly. The old wolf lets you. You think, after that, that the two of you have an understanding.' }, end('wolves')],
      },
    ],
  },

  // ── A flash on the hill ────────────────────────────────────────────
  {
    id: 'mirror-1',
    title: 'A flash on the hill',
    text: [
      'Something on the eastern hill catches the low sun and flashes. Then again. Then three quick and three slow.',
      'Somebody is signalling.',
    ],
    choices: [
      {
        id: 'answer',
        label: 'answer with the pot lid',
        tools: ['pot'],
        effects: [{ log: 'You tilt the lid until it catches the sun. The flashing stops, then starts again, faster.' }, go('mirror', 'mirror-2', soon)],
      },
      {
        id: 'smoke',
        label: 'answer with green wood on the fire',
        cost: { wood: 2 },
        effects: [{ log: 'A column of white smoke goes up. The hill goes still, and stays still.' }, go('mirror', 'mirror-2', later)],
      },
      {
        id: 'hide',
        label: 'damp the fire and lie low',
        effects: [{ log: 'You keep your heads down until dark. Nobody comes. Nobody signals again.' }, end('mirror')],
      },
    ],
  },
  {
    id: 'mirror-2',
    title: 'A tin on a stump',
    text: [
      'On a stump at the edge of the clearing, where anyone coming from the east would pass, a tobacco tin. Inside, a note in pencil:',
      '“Eleven of us at the old ranger station. We have seed. Need medicine. Leave word.”',
    ],
    choices: [
      {
        id: 'send-medicine',
        label: 'leave them medicine',
        cost: { medicine: 1 },
        effects: [{ log: 'You leave the medicine in the tin, and a note of your own.' }, go('mirror', 'mirror-3', later)],
      },
      {
        id: 'note-only',
        label: 'leave a note',
        effects: [{ log: '“We are here,” you write. You cannot think of anything else worth saying.' }, go('mirror', 'mirror-3', later)],
      },
      {
        id: 'take-tin',
        label: 'keep the tin and say nothing',
        effects: [{ log: 'A good tin. You keep it. Nobody from the east leaves anything again.' }, end('mirror')],
      },
    ],
  },
  {
    id: 'mirror-3',
    title: 'Neighbours',
    tone: 'good',
    text: [
      'The tin is back on the stump, heavier. Inside, wrapped in waxed paper, seed: beans and squash and something labelled only in a child’s writing as “GOOD ONES”.',
      'The note says: “Thank you. Spring is coming. We will be here.”',
    ],
    choices: [
      {
        id: 'keep',
        label: 'keep the seed for spring',
        effects: [
          { flag: 'neighbours' },
          { flag: 'loc-station' },
          { grant: { forage: 4 } },
          { record: 'The camp traded word, and seed, with the people at the ranger station.' },
          { log: 'You put the seed somewhere dry. For the first time in a long while, you think about next year.', tone: 'good' },
          end('mirror'),
        ],
      },
    ],
  },

  // ── The cough ──────────────────────────────────────────────────────
  {
    id: 'cough-1',
    title: 'A cough',
    tone: 'warn',
    cast: 'survivor',
    text: [
      '{name} has a cough. A dry, tight cough that goes on long after they should have stopped. They say it is nothing.',
    ],
    choices: [
      {
        id: 'apart',
        label: 'give them a bed apart',
        effects: [{ trust: { who: 'cast', delta: -0.04 } }, { log: '{name} moves their blanket to the far side of the fire and does not complain.' }, go('cough', 'cough-2', later)],
      },
      {
        id: 'nothing',
        label: 'it is probably nothing',
        effects: [{ log: 'Probably nothing.' }, go('cough', 'cough-3', soon)],
      },
    ],
  },
  {
    id: 'cough-2',
    title: 'Only one cough',
    tone: 'good',
    cast: 'survivor',
    text: [
      'The cough in the far bed goes on for days, then eases. Nobody else has caught it. Keeping {name} apart may have done it, or luck may have.',
    ],
    choices: [
      {
        id: 'welcome-back',
        label: 'bring {name} back to the fire',
        effects: [{ trust: { who: 'cast', delta: 0.06 } }, { person: { who: 'cast', health: 0.1 } }, { log: '{name} comes back to the fire, hoarse, and grinning.' }, end('cough')],
      },
    ],
  },
  {
    id: 'cough-3',
    title: 'Coughing in the dark',
    tone: 'danger',
    cast: 'survivor',
    text: [
      'Now there are three of them coughing, and {name} is burning with fever. The sound of it fills the dark all night.',
    ],
    choices: [
      {
        id: 'medicine',
        label: 'medicine for the worst of them',
        cost: { medicine: 1 },
        effects: [{ person: { who: 'cast', health: 0.25 } }, { person: { who: 'random', health: -0.1, cause: 'sickness' } }, { log: 'The medicine brings {name}’s fever down. The others cough on, but it passes in a week.' }, end('cough')],
      },
      {
        id: 'broth',
        label: 'broth and warmth for all of them',
        cost: { rations: 3, water: 2 },
        effects: [{ person: { who: 'all', health: -0.05, cause: 'sickness' } }, { trust: { who: 'all', delta: 0.04 } }, { log: 'A long, miserable week of broth and coughing. Everyone comes through it thinner.' }, end('cough')],
      },
      {
        id: 'endure',
        label: 'they will have to sweat it out',
        effects: [{ person: { who: 'cast', health: -0.3, cause: 'sickness' } }, { person: { who: 'random', health: -0.15, cause: 'sickness' } }, { log: 'It goes through the camp like a hand through smoke. Some of them come out of it badly.', tone: 'danger' }, end('cough')],
      },
    ],
  },

  // ── Meltwater ──────────────────────────────────────────────────────
  {
    id: 'meltwater-1',
    title: 'The creek is rising',
    tone: 'warn',
    text: [
      'The creek has doubled since yesterday, brown and loud, carrying whole branches. It has never come this high.',
    ],
    choices: [
      {
        id: 'move-stores',
        label: 'move the stores uphill',
        effects: [{ vital: { warmth: -0.05 } }, { log: 'A day of carrying, cursing in the mud. Everything ends up higher, and nothing is where you can find it.' }, go('meltwater', 'meltwater-2', soon)],
      },
      {
        id: 'dig',
        label: 'dig a channel to turn it',
        effects: [{ log: 'Everyone with hands digs. The trench is not deep, but it is long.' }, go('meltwater', 'meltwater-3', soon)],
      },
      {
        id: 'wait',
        label: 'it will go down',
        effects: [go('meltwater', 'meltwater-4', soon)],
      },
    ],
  },
  {
    id: 'meltwater-2',
    title: 'High water',
    text: ['The water comes up in the night to where the stores used to be, and no further. By noon it is going down.'],
    choices: [{ id: 'ok', label: 'good', effects: [{ log: 'You carry it all back down, muddier.' }, end('meltwater')] }],
  },
  {
    id: 'meltwater-3',
    title: 'The channel holds',
    tone: 'good',
    text: ['In the night you hear the water find the trench and roar along it, away from the camp. In the morning there is a new stream, and good clay at the bottom of it.'],
    choices: [{ id: 'ok', label: 'dig out some clay', effects: [{ grant: { stone: 3 } }, { log: 'The clay will do for chinking walls.', tone: 'good' }, end('meltwater')] }],
  },
  {
    id: 'meltwater-4',
    title: 'Flood',
    tone: 'danger',
    text: ['It does not go down. The water comes into the camp a hand deep, then a shin deep, and carries off whatever it can lift.'],
    choices: [
      {
        id: 'save',
        label: 'save what you can',
        effects: [{ take: { rations: 3, forage: 4, wood: 5 } }, { log: 'When it goes down there is mud over everything, and less of everything.', tone: 'warn' }, end('meltwater')],
      },
    ],
  },

  // ── The hermit ─────────────────────────────────────────────────────
  {
    id: 'hermit-1',
    title: 'Somebody else’s snares',
    text: [
      'Out along the creek you find snares that are not yours. Good ones, better than yours, set by someone who knows exactly where the hares run.',
    ],
    choices: [
      {
        id: 'leave-sign',
        label: 'leave them be, and a sign you were here',
        effects: [{ log: 'You tie a strip of red cloth to the nearest branch, and leave the snares alone.' }, go('hermit', 'hermit-2', later)],
      },
      {
        id: 'rob',
        label: 'empty them',
        effects: [{ grant: { meat: 2 } }, { log: 'Two hares, warm. You do not go back to that stretch of creek.' }, end('hermit')],
      },
    ],
  },
  {
    id: 'hermit-2',
    title: 'The old man',
    text: [
      'An old man is sitting by your fire when you come back from the woodpile, warming his hands, entirely at ease. His beard is down to his belt.',
      '“Red cloth,” he says. “Polite. Nobody’s polite any more.”',
    ],
    choices: [
      {
        id: 'feed',
        label: 'feed him',
        cost: { rations: 1 },
        effects: [{ log: 'He eats slowly, and talks about the valley: where the water is clean, where the ground is soft in spring, where not to go. He leaves before dark.' }, { grant: { medicine: 1 } }, go('hermit', 'hermit-3', later)],
      },
      {
        id: 'ask-stay',
        label: 'ask him to stay',
        effects: [{ log: 'He laughs until he coughs. “Forty years I’ve been alone up here,” he says. “I’m not going to start liking people now.”' }, go('hermit', 'hermit-3', later)],
      },
    ],
  },
  {
    id: 'hermit-3',
    title: 'No smoke from the cabin',
    tone: 'warn',
    text: [
      'There has been no smoke from the old man’s cabin for three days. Somebody walks up to look.',
      'He is in his chair, by the cold stove, as if he had sat down for a moment to rest.',
    ],
    choices: [
      {
        id: 'bury',
        label: 'bury him, and take what he left',
        effects: [
          { grant: { medicine: 2, wire: 2, rations: 3 } },
          { record: 'The old man up the valley died in his chair, and the camp buried him.' },
          { log: 'There was a note pinned to the door: “Polite ones get the lot.” You bury him under the pines.', tone: 'good' },
          end('hermit'),
        ],
      },
    ],
  },

  // ── Many boots ─────────────────────────────────────────────────────
  {
    id: 'boots-1',
    title: 'Many boots',
    tone: 'warn',
    text: [
      'Bootprints in the new snow along the ridge path. Ten people at least, walking in step. They passed in the night, close enough to see your fire.',
    ],
    choices: [
      {
        id: 'watch',
        label: 'set a watch on the ridge',
        effects: [{ log: 'Somebody goes up to the ridge with a blanket and stays there.' }, go('boots', 'boots-2', soon)],
      },
      {
        id: 'hope',
        label: 'hope they keep walking',
        effects: [go('boots', 'boots-2', soon)],
      },
    ],
  },
  {
    id: 'boots-2',
    title: 'At the treeline',
    tone: 'danger',
    text: [
      'They come at noon, and stop at the treeline in a line, so you can count them. Eleven. One comes forward alone, hands open.',
      '“Winter’s long,” she says. “We’re asking every camp for a share. It’s easier for everybody if you give it.”',
    ],
    choices: [
      {
        id: 'pay',
        label: 'give them a share',
        cost: { rations: 4, wood: 4 },
        effects: [{ trust: { who: 'all', delta: -0.03 } }, { log: 'They take it, politely, and go. Somebody spits on the ground where they stood.' }, end('boots')],
      },
      {
        id: 'stand',
        label: 'stand together at the fire',
        when: { popMin: 5 },
        effects: [
          { trust: { who: 'all', delta: 0.08 } },
          { record: 'The camp stood together at the fire, and the strangers went away.' },
          { log: 'Everyone stands up. Nobody says anything. After a long moment, she nods, and they go.', tone: 'good' },
          end('boots'),
        ],
      },
      {
        id: 'refuse',
        label: '“We have nothing to spare.”',
        effects: [
          {
            roll: 0.5,
            pass: [{ log: 'She looks at you for a long moment, then shrugs. “Your funeral,” she says, and they go.' }],
            fail: [{ take: { rations: 3, meat: 2 } }, { person: { who: 'random', health: -0.2, cause: 'wounds' } }, { log: 'They come back that night. In the morning the stores are lighter and someone is hurt.', tone: 'danger' }],
          },
          end('boots'),
        ],
      },
    ],
  },

  // ── The letter (arc) ───────────────────────────────────────────────
  {
    id: 'letter-1',
    title: 'A letter',
    cast: 'arcless',
    text: [
      '{name} is reading a letter by the fire. When they see you looking, they fold it very small.',
      '“To my sister,” they say. “I wrote it the week it all started. Never sent it. Where would I send it?”',
    ],
    choices: [
      {
        id: 'ask',
        label: 'ask about the sister',
        effects: [{ trust: { who: 'cast', delta: 0.05 } }, { log: 'She lived in the town down the highway, {name} says. Had a dog called Biscuit. That is all they will say tonight.' }, go('letter', 'letter-2', later)],
      },
      {
        id: 'leave',
        label: 'leave them to it',
        effects: [{ log: '{name} puts the letter away and stares into the fire.' }, go('letter', 'letter-2', later)],
      },
    ],
  },
  {
    id: 'letter-2',
    title: 'Down the highway',
    cast: 'survivor',
    text: [
      '{name} asks for two days to walk down the highway, to the town, and look. “Just look,” they say. “I won’t be stupid.”',
    ],
    choices: [
      {
        id: 'let-go',
        label: 'let them go',
        effects: [{ idle: 'cast' }, { trust: { who: 'cast', delta: 0.1 } }, { log: '{name} goes at dawn with a stick and a day’s food.' }, go('letter', 'letter-3', soon)],
      },
      {
        id: 'too-dangerous',
        label: '“It’s too dangerous.”',
        effects: [{ trust: { who: 'cast', delta: -0.08 } }, { log: '{name} does not argue. That night they burn the letter in the fire without reading it again.' }, end('letter')],
      },
    ],
  },
  {
    id: 'letter-3',
    title: 'Back from the town',
    cast: 'survivor',
    text: [
      '{name} comes back at dusk, tired, with mud to the knees. They sit down and are quiet for a long time.',
      '“The house was empty,” they say at last. “But there was a note on the door. Gone north, it said. With Biscuit.”',
    ],
    choices: [
      {
        id: 'hope',
        label: '“Then she’s alive.”',
        effects: [{ person: { who: 'cast', health: 0.1 } }, { trust: { who: 'cast', delta: 0.08 } }, { log: '{name} laughs, and then cries, and then goes to sleep for twelve hours.', tone: 'good' }, end('letter')],
      },
    ],
  },

  // ── The carving (arc) ──────────────────────────────────────────────
  {
    id: 'carving-1',
    title: 'Shavings',
    cast: 'arcless',
    text: [
      'Pale shavings around {name}’s place every morning. They work at night, turned away from the fire, and put whatever it is away the moment anyone comes near.',
    ],
    choices: [
      {
        id: 'ask',
        label: 'ask what it is',
        effects: [{ log: '“You’ll see,” {name} says, and that is all.' }, go('carving', 'carving-2', later)],
      },
      {
        id: 'wood',
        label: 'leave them a good piece of wood',
        cost: { wood: 1 },
        effects: [{ trust: { who: 'cast', delta: 0.05 } }, { log: 'A clean, knot-free length of pine, left by their blanket. In the morning it is gone.' }, go('carving', 'carving-2', later)],
      },
    ],
  },
  {
    id: 'carving-2',
    title: 'A gift',
    tone: 'good',
    cast: 'survivor',
    text: [
      '{name} sets something down on the stone by the fire, steps back, and waits.',
      'It is the camp. All of it, in pine, a hand across: the fire, the lean-to, the woodpile, little figures sitting round. One of them, you realise, is you.',
    ],
    choices: [
      {
        id: 'place',
        label: 'give it the place of honour',
        effects: [
          { trust: { who: 'all', delta: 0.05 } },
          { trust: { who: 'cast', delta: 0.12 } },
          { log: 'It sits by the fire where everyone can see it. People move the little figures around when they think nobody is looking.', tone: 'good' },
          end('carving'),
        ],
      },
    ],
  },

  // ── The old wound (arc) ────────────────────────────────────────────
  {
    id: 'old-wound-1',
    title: 'A limp',
    cast: 'arcless',
    text: [
      '{name} has been limping, and lying about it. When they think nobody is looking, they unwind a filthy bandage from their calf and look at what is under it for a long time.',
    ],
    choices: [
      {
        id: 'look',
        label: 'insist on seeing it',
        effects: [{ log: 'An old cut, from before they came, that never closed. Red at the edges. Not good.' }, go('old-wound', 'old-wound-2', soon)],
      },
      {
        id: 'respect',
        label: 'let them keep their secret',
        effects: [{ log: '{name} goes on limping, and lying about it.' }, go('old-wound', 'old-wound-3', later)],
      },
    ],
  },
  {
    id: 'old-wound-2',
    title: 'Cleaning it out',
    cast: 'survivor',
    text: [
      'It needs opening and cleaning, properly, with boiled water and a sharp knife and somebody holding {name} down.',
    ],
    choices: [
      {
        id: 'medicine',
        label: 'clean it, and use the medicine',
        cost: { medicine: 1, water: 1 },
        effects: [{ person: { who: 'cast', health: 0.3 } }, { trust: { who: 'cast', delta: 0.15 } }, { log: 'It is horrible for a quarter of an hour, and then it is done. Within a week {name} is walking straight.', tone: 'good' }, end('old-wound')],
      },
      {
        id: 'knife',
        label: 'clean it with what you have',
        tools: ['knife'],
        cost: { water: 2 },
        effects: [
          {
            roll: 0.6,
            pass: [{ person: { who: 'cast', health: 0.2 } }, { trust: { who: 'cast', delta: 0.1 } }, { log: 'It heals. Slowly, and leaving a scar like a map, but it heals.', tone: 'good' }],
            fail: [{ person: { who: 'cast', health: -0.25, cause: 'wounds' } }, { log: 'It turns. For days {name} is very ill, and when they come through it they will always limp.', tone: 'warn' }],
          },
          end('old-wound'),
        ],
      },
      {
        id: 'bind',
        label: 'bind it clean and hope',
        effects: [{ log: 'A clean strip of cloth, and hope.' }, go('old-wound', 'old-wound-3', later)],
      },
    ],
  },
  {
    id: 'old-wound-3',
    title: 'Fever from the leg',
    tone: 'danger',
    cast: 'survivor',
    text: ['{name} is grey and sweating and cannot stand. The leg is hot to the touch from knee to ankle.'],
    choices: [
      {
        id: 'medicine',
        label: 'medicine, now',
        cost: { medicine: 1 },
        effects: [{ person: { who: 'cast', health: 0.15 } }, { log: 'The fever breaks on the third day. {name} says, very weakly, that you should have made them show you.' }, end('old-wound')],
      },
      {
        id: 'nothing',
        label: 'there is nothing to give',
        effects: [{ person: { who: 'cast', health: -0.4, cause: 'wounds' } }, { log: 'All you can do is sit with them.', tone: 'danger' }, end('old-wound')],
      },
    ],
  },

  // ── Lessons (arc) ──────────────────────────────────────────────────
  {
    id: 'lessons-1',
    title: 'Letters in the ash',
    cast: 'arcless',
    text: [
      '{name} is drawing letters in the ash at the edge of the fire with a stick, for one of the others who never learned to read. Patient. Very patient. Like someone who used to do this for a living.',
    ],
    choices: [
      {
        id: 'encourage',
        label: '“Teach all of us.”',
        effects: [{ trust: { who: 'cast', delta: 0.08 } }, { log: '{name} looks surprised, then pleased, then nervous.' }, go('lessons', 'lessons-2', later)],
      },
      {
        id: 'work',
        label: '“There’s work to do.”',
        effects: [{ trust: { who: 'cast', delta: -0.05 } }, { log: '{name} smooths the ash over and goes back to work.' }, end('lessons')],
      },
    ],
  },
  {
    id: 'lessons-2',
    title: 'School by firelight',
    tone: 'good',
    cast: 'survivor',
    text: [
      'Every evening now, after supper, an hour of {name}’s school: letters, sums, the names of stars, how to splint a wrist. Even the ones who said it was a waste of time stay to listen.',
    ],
    choices: [
      {
        id: 'notebook',
        label: 'give them a page of the notebook',
        effects: [
          { flag: 'lessons' },
          { trust: { who: 'all', delta: 0.04 } },
          { log: 'The camp learns. Slowly, and arguing, but it learns.', tone: 'good' },
          end('lessons'),
        ],
      },
    ],
  },

  // ── The ring (arc) ─────────────────────────────────────────────────
  {
    id: 'ring-1',
    title: 'A house with a blue door',
    cast: 'arcless',
    text: [
      '{name} hears you talk about the drowned suburb and goes very quiet. Then: “Larch Street. A house with a blue door. My mother’s ring is in the kitchen drawer, in a tin.”',
      '“If you’re going that way anyway. Only if.”',
    ],
    choices: [
      {
        id: 'promise',
        label: '“I’ll look.”',
        effects: [{ trust: { who: 'cast', delta: 0.05 } }, { log: 'Larch Street, blue door, kitchen drawer. You say it over to yourself so as not to forget.' }, go('ring', 'ring-2', [60, 120])],
      },
      {
        id: 'no-promise',
        label: '“I can’t promise that.”',
        effects: [{ log: '{name} nods. “No. Of course not.”' }, end('ring')],
      },
    ],
  },
  {
    id: 'ring-2',
    title: 'The ring',
    tone: 'good',
    cast: 'survivor',
    when: { flags: ['request-ring'] },
    text: [
      'You hold out the tin. {name} opens it, and looks for a long time, and closes it again.',
      '“She wore it every day,” they say. “Every single day.”',
    ],
    choices: [
      {
        id: 'give',
        label: 'say nothing',
        effects: [{ trust: { who: 'cast', delta: 0.25 } }, { trust: { who: 'all', delta: 0.03 } }, { log: 'That night {name} wears it on a ribbon round their neck, and touches it now and then, as if to check.', tone: 'good' }, end('ring')],
      },
    ],
  },

  // ── At first light (arc) ───────────────────────────────────────────
  {
    id: 'dawn-prayer-1',
    title: 'At first light',
    cast: 'arcless',
    text: [
      'Every dawn {name} walks a little way from the fire, faces the east, and stands very still for as long as it takes the sun to clear the trees. Some of the others have started to laugh about it.',
    ],
    choices: [
      {
        id: 'join',
        label: 'stand with them, one morning',
        effects: [{ trust: { who: 'cast', delta: 0.1 } }, { log: 'You stand beside {name} in the cold. They do not explain, and you do not ask. It is very quiet.' }, go('dawn-prayer', 'dawn-prayer-2', later)],
      },
      {
        id: 'stop-laughing',
        label: 'tell the others to leave them be',
        effects: [{ trust: { who: 'cast', delta: 0.06 } }, { log: 'The laughing stops, at least where you can hear it.' }, go('dawn-prayer', 'dawn-prayer-2', later)],
      },
      {
        id: 'nothing',
        label: 'it is not your business',
        effects: [end('dawn-prayer')],
      },
    ],
  },
  {
    id: 'dawn-prayer-2',
    title: 'More of them',
    tone: 'good',
    cast: 'survivor',
    when: { phase: ['dawn', 'day'] },
    text: [
      'This morning there are five people standing at the edge of the camp with {name}, facing the east. Nobody asked them to. Nobody says anything afterwards. But the day goes better.',
    ],
    choices: [
      {
        id: 'good',
        label: 'let it be the camp’s',
        effects: [{ trust: { who: 'all', delta: 0.05 } }, { person: { who: 'all', health: 0.03 } }, end('dawn-prayer')],
      },
    ],
  },
];
