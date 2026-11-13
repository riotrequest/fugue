/**
 * The far valley: places the camp only learns about later, through the
 * notebook's maps, the people at the ranger station, or a second year. Their
 * encounters are ordinary events (events.js), drawn by locations.js like any
 * others; what they grant goes into the pack.
 *
 * None of these places holds a memory scene. The twelve memories stay where
 * they were; out here the camp finds its future rather than your past.
 */

const QUARRY = [
  {
    id: 'quarry-face',
    title: 'The quarry face',
    text: ['A wall of grey stone cut in steps, each one taller than a man. Loose blocks lie where they fell, already split.'],
    choices: [
      {
        id: 'blocks',
        label: 'load the good blocks',
        effects: [{ grant: { stone: [4, 6] } }, { vital: { warmth: -0.05 } }, { log: 'Back-breaking. But the blocks are square and sound.' }],
      },
      {
        id: 'climb',
        label: 'climb to the top step',
        hint: 'you can see a long way from there',
        effects: [
          {
            roll: 0.7,
            pass: [{ insight: 60 }, { log: 'From the top step you can see the whole valley laid out like your map, and where the map is wrong.', tone: 'good' }],
            fail: [{ vital: { health: -0.15 } }, { log: 'A foothold goes. You slide two steps and land hard.', tone: 'warn' }],
          },
        ],
      },
    ],
  },
  {
    id: 'quarry-shed',
    title: 'The site office',
    text: ['A tin hut with a padlock rusted open. Hard hats on hooks. A calendar from a year that is no longer any use to anyone.'],
    choices: [
      {
        id: 'search',
        label: 'search it',
        effects: [{ grant: { scrap: [2, 3], wire: [1, 2] } }, { roll: 0.4, pass: [{ grant: { batteries: 1 } }] }, { log: 'Cable, bolts, a toolbox with half its tools.' }],
      },
      { id: 'on', label: 'leave it be', effects: [] },
    ],
  },
  {
    id: 'quarry-pool',
    title: 'Green water',
    text: ['The bottom of the quarry is flooded, green and very still. Something has been drinking at the edge: prints, big ones.'],
    choices: [
      {
        id: 'fill',
        label: 'fill the water skins',
        effects: [{ grant: { water: [2, 3] } }, { log: 'Cold, and tasting of stone. Better than nothing.' }],
      },
      {
        id: 'wait',
        label: 'wait to see what comes',
        tools: ['spear'],
        effects: [
          {
            roll: 0.45,
            pass: [{ grant: { meat: 3, hide: 1 } }, { log: 'A deer, at dusk. You do not miss.', tone: 'good' }],
            fail: [{ vital: { warmth: -0.12 } }, { log: 'Nothing comes but the cold.' }],
          },
        ],
      },
    ],
  },
  {
    id: 'quarry-truck',
    title: 'The dump truck',
    text: ['A dump truck as big as a house, nose down in the gravel, tyres taller than you. Its cab door hangs open.'],
    choices: [
      {
        id: 'cab',
        label: 'climb into the cab',
        effects: [{ grant: { cloth: 1, scrap: 2 } }, { roll: 0.3, pass: [{ grant: { parts: 1 } }] }, { log: 'Seat foam, a jacket, a radio torn half out of the dash.' }],
      },
      { id: 'on', label: 'walk on', effects: [] },
    ],
  },
];

const LAKE = [
  {
    id: 'lake-ice',
    title: 'Black ice',
    when: { season: ['first-winter', 'winter'] },
    text: ['The lake is frozen clear, so clear you can see weed moving under your boots, and a fish turning slowly in the dark.'],
    choices: [
      {
        id: 'fish',
        label: 'cut a hole and fish',
        tools: ['knife'],
        effects: [{ grant: { meat: [1, 3] } }, { vital: { warmth: -0.1 } }, { log: 'An hour with your hand in the hole, and a few fish for it.' }],
      },
      {
        id: 'cross',
        label: 'cross to the far shore',
        effects: [
          {
            roll: 0.75,
            pass: [{ grant: { wood: 4, tinder: 2 } }, { log: 'The far shore is thick with deadfall nobody has touched.', tone: 'good' }],
            fail: [{ vital: { warmth: -0.35, health: -0.1 } }, { log: 'A crack like a gunshot, and you are in to the waist. You get out. You do not know how.', tone: 'danger' }],
          },
        ],
      },
    ],
  },
  {
    id: 'lake-boathouse',
    title: 'The boathouse',
    text: ['A boathouse on stilts, its doors fallen in. Inside, a canoe hangs from the rafters, and coils of rope, and a tackle box.'],
    choices: [
      {
        id: 'rope',
        label: 'take the rope and tackle',
        effects: [{ grant: { fiber: [3, 5], wire: 1 } }, { log: 'Good line, hooks, a lead weight shaped like a pear.' }],
      },
      {
        id: 'sit',
        label: 'sit on the jetty a while',
        effects: [{ vital: { health: 0.05 } }, { log: 'You sit with your boots over the water. For a few minutes, nothing is needed of you.' }],
      },
    ],
  },
  {
    id: 'lake-reeds',
    title: 'Reed beds',
    text: ['Reeds taller than you, brown and rattling. Somewhere inside them, ducks argue.'],
    choices: [
      {
        id: 'cut',
        label: 'cut reeds for thatch and cord',
        effects: [{ grant: { fiber: [3, 4] } }, { log: 'Armfuls. They will do for cord, and for roofing.' }],
      },
      {
        id: 'roots',
        label: 'dig for roots',
        effects: [{ grant: { forage: [2, 4] } }, { log: 'Fat white roots, muddy and sweet.', tone: 'good' }],
      },
    ],
  },
  {
    id: 'lake-cabin',
    title: 'A summer cabin',
    text: ['A summer cabin with its shutters still closed, as if the family meant to come back next year. The key is under the mat. Of course it is.'],
    choices: [
      {
        id: 'inside',
        label: 'go inside',
        effects: [{ grant: { cloth: [2, 3], rations: [1, 2] } }, { roll: 0.35, pass: [{ grant: { medicine: 1 } }] }, { log: 'Blankets in a cedar chest. Tins in the pantry. A jigsaw, half finished, on the table.' }],
      },
      { id: 'leave', label: 'leave it for them', effects: [{ log: 'You put the key back under the mat.' }] },
    ],
  },
];

const FARM = [
  {
    id: 'farm-barn',
    title: 'The barn',
    text: ['The barn roof has come down at one end. Under the end still standing: hay, bales of it, and machinery furred with rust.'],
    choices: [
      {
        id: 'tools',
        label: 'strip the machinery',
        effects: [{ grant: { scrap: [3, 4], wire: [1, 2] } }, { log: 'Chain, bolts, a blade that will sharpen.' }],
      },
      {
        id: 'hay',
        label: 'bundle hay for bedding',
        effects: [{ grant: { fiber: [3, 5] } }, { log: 'It smells of summer. You had forgotten that smell.' }],
      },
    ],
  },
  {
    id: 'farm-kitchen',
    title: 'The farmhouse kitchen',
    text: ['A big kitchen with a cold range. Jars on a shelf, some burst by the frost, some not.'],
    choices: [
      {
        id: 'jars',
        label: 'take the jars that held',
        effects: [{ grant: { rations: [2, 4] } }, { log: 'Pickled beans, plums, something that might be beetroot.', tone: 'good' }],
      },
      {
        id: 'seed',
        label: 'look for the seed tin',
        effects: [{ grant: { forage: 2 } }, { insight: 45 }, { log: 'Every farm kitchen has one. This one is under the sink: seed in paper packets, each one labelled in a careful hand.' }],
      },
    ],
  },
  {
    id: 'farm-orchard',
    title: 'The orchard',
    when: { season: ['summer', 'autumn'] },
    text: ['Apple trees gone wild, branches bowed down. The grass under them is thick with windfalls and wasps.'],
    choices: [
      {
        id: 'pick',
        label: 'fill your pack',
        effects: [{ grant: { forage: [4, 6] } }, { log: 'You eat three before you have filled the pack, and do not regret one of them.', tone: 'good' }],
      },
      { id: 'on', label: 'leave them to the wasps', effects: [] },
    ],
  },
  {
    id: 'farm-grave',
    title: 'Under the oak',
    text: ['Three graves under the oak behind the house, marked with stones painted white. The newest has a child’s wellington boot on it.'],
    choices: [
      {
        id: 'stand',
        label: 'stand a while',
        effects: [{ log: 'You stand until the cold gets into your feet. Then you go.' }],
      },
      {
        id: 'tidy',
        label: 'straighten the stones',
        effects: [{ vital: { warmth: -0.04 } }, { log: 'It does not matter to anyone. You do it anyway.' }],
      },
    ],
  },
];

const STATION = [
  {
    id: 'station-gate',
    title: 'The ranger station',
    text: [
      'A log building with a flag still flying, faded to grey. Smoke from the chimney. A woman at the gate with a shotgun broken over her arm, watching you come.',
      '“You’re the fire across the valley,” she says. “We wondered when.”',
    ],
    choices: [
      {
        id: 'trade',
        label: 'offer them medicine',
        cost: { medicine: 1 },
        effects: [{ grant: { rations: 3, forage: 3 } }, { log: 'Medicine is worth more than food out here. They pay you in both.', tone: 'good' }],
      },
      {
        id: 'talk',
        label: 'just talk',
        effects: [{ insight: 40 }, { log: 'An hour on their porch, trading news. They know things about the valley you did not.' }],
      },
    ],
  },
  {
    id: 'station-garden',
    title: 'Their garden',
    text: ['Behind the station, a garden under old windows propped on stones. Green things growing in winter. You stare.'],
    choices: [
      {
        id: 'learn',
        label: 'ask how they do it',
        effects: [{ insight: 70 }, { log: 'Glass, dung, a south-facing wall. They explain it twice and draw you a picture.', tone: 'good' }],
      },
      {
        id: 'seedlings',
        label: 'ask for seedlings',
        effects: [{ grant: { forage: 3 } }, { log: 'A tray of seedlings, wrapped in sacking, carried home against your chest.' }],
      },
    ],
  },
  {
    id: 'station-child',
    title: 'A child with a question',
    text: ['A child follows you around the station yard for a while, and finally asks whether there are any other children at your fire.'],
    choices: [
      {
        id: 'truth',
        label: 'tell the truth',
        effects: [{ log: 'The child nods, very serious, and gives you a drawing to take back. It is of a fire, with a lot of people around it.' }],
      },
      {
        id: 'maybe',
        label: '“Not yet.”',
        effects: [{ log: '“Not yet,” the child repeats, and seems satisfied with that.' }],
      },
    ],
  },
  {
    id: 'station-radio',
    title: 'Their radio',
    text: ['They have a radio set in the back room, dead, and a man who used to know how to make it live, before his hands shook.'],
    choices: [
      {
        id: 'parts',
        label: 'trade for spare parts',
        cost: { scrap: 3 },
        effects: [{ grant: { parts: 1, batteries: 1 } }, { log: 'A fair trade, he says, and means it.' }],
      },
      { id: 'on', label: 'thank him and go', effects: [] },
    ],
  },
];

const PASS = [
  {
    id: 'pass-snowfield',
    title: 'The snowfield',
    text: ['Above the trees the world goes white and very wide. The wind has carved the snow into ridges like a frozen sea.'],
    choices: [
      {
        id: 'push',
        label: 'push on to the top',
        effects: [
          {
            roll: 0.65,
            pass: [{ flag: 'seen-beyond' }, { log: 'From the top of the pass: another valley, and in it, lights. Not one. Dozens.', tone: 'good' }],
            fail: [{ vital: { warmth: -0.3 } }, { log: 'The wind turns you back a hundred yards short. Next time.', tone: 'warn' }],
          },
        ],
      },
      { id: 'turn', label: 'turn back', effects: [{ log: 'Not today.' }] },
    ],
  },
  {
    id: 'pass-hut',
    title: 'The refuge hut',
    text: ['A stone hut built for walkers, its door on the downhill side. A logbook on a shelf: names and dates, the last entry very recent.'],
    choices: [
      {
        id: 'read',
        label: 'read the last entry',
        effects: [{ insight: 50 }, { log: '“Twelve of us, heading south. The road is open past the lake. Whoever reads this: it is better there.”' }],
      },
      {
        id: 'write',
        label: 'write your own',
        effects: [{ record: 'Someone from the camp wrote in the logbook at the top of the pass.' }, { log: 'You write the camp’s name, which it did not have until you wrote it.' }],
      },
    ],
  },
  {
    id: 'pass-cairn',
    title: 'Markers',
    text: ['Stone cairns every hundred yards, marking the way. Someone has kept them up this winter: new stones on top, still unweathered.'],
    choices: [
      {
        id: 'add',
        label: 'add a stone to each',
        effects: [{ vital: { warmth: -0.05 } }, { log: 'You add a stone to every cairn you pass. It seems the least you can do.' }],
      },
      { id: 'on', label: 'follow them', effects: [] },
    ],
  },
  {
    id: 'pass-ibex',
    title: 'Goats',
    text: ['A line of wild goats on a ledge above you, impossibly placed, chewing, watching you with their yellow eyes.'],
    choices: [
      {
        id: 'hunt',
        label: 'try for one',
        tools: ['spear'],
        effects: [
          {
            roll: 0.35,
            pass: [{ grant: { meat: 3, hide: 2 } }, { log: 'You get one. You will feel the climb for a week.', tone: 'good' }],
            fail: [{ log: 'They go up the cliff as if it were a staircase. You do not follow.' }],
          },
        ],
      },
      { id: 'watch', label: 'watch them', effects: [{ log: 'They watch you back until you are the one who leaves.' }] },
    ],
  },
];

/** Something a survivor asked you to look for, out on the road. */
const REQUESTS = [
  {
    id: 'request-found',
    title: 'What {name} asked for',
    cast: 'survivor',
    text: ['In a drawer, under a pile of mildewed papers, exactly what {name} described: a tin box, and in it a ring on a ribbon.'],
    choices: [
      {
        id: 'take',
        label: 'take it home for {name}',
        effects: [{ flag: 'request-ring' }, { log: 'You put it in the inside pocket of your coat and keep your hand on it all the way.' }],
      },
    ],
  },
];

export const FRONTIER_ENCOUNTERS = [...QUARRY, ...LAKE, ...FARM, ...STATION, ...PASS, ...REQUESTS];
