/**
 * What happens out in the ruins. These are ordinary events (see events.js for the
 * shape); locations.js decides which of them a trip can draw. Anything granted
 * here goes into the player's pack and only reaches the camp if they get home.
 */

const CREEK = [
  {
    id: 'creek-pool',
    title: 'The pool',
    text: [
      'Below a fallen alder the creek slows into a deep pool. Shapes hang in the current, nose to the flow.',
    ],
    choices: [
      {
        id: 'spear',
        label: 'spear one',
        tools: ['spear'],
        effects: [
          { grant: { meat: [2, 3] } },
          { log: 'The spear goes in clean. Then again. The pool empties in a flash of silver.', tone: 'good' },
        ],
      },
      {
        id: 'hands',
        label: 'feel under the bank',
        hint: 'slow, cold work',
        effects: [
          {
            roll: 0.5,
            pass: [{ grant: { meat: 1 } }, { log: 'Your fingers close on something muscular. You do not let go.', tone: 'good' }],
            fail: [{ vital: { warmth: -0.15 } }, { log: 'Nothing. Your arms are numb to the shoulder.', tone: 'warn' }],
          },
        ],
      },
      { id: 'on', label: 'move on', effects: [] },
    ],
  },
  {
    id: 'creek-camp',
    title: 'Someone else’s camp',
    text: [
      'A ring of blackened stones on a gravel bar. A tent, collapsed, green with algae. Nobody has been here since before the leaves fell.',
    ],
    choices: [
      {
        id: 'tent',
        label: 'search the tent',
        effects: [
          { grant: { cloth: [1, 2] } },
          { roll: 0.35, pass: [{ grant: { medicine: 1 } }] },
          { log: 'A sleeping bag, a tin cup, a toothbrush. You cut out the cloth that is still sound.' },
        ],
      },
      {
        id: 'stones',
        label: 'take the hearth stones',
        effects: [{ grant: { stone: 3 } }, { log: 'Good flat stones. Their fire has no more use for them.' }],
      },
    ],
  },
  {
    id: 'creek-culvert',
    title: 'The culvert',
    text: [
      'The creek goes under the road through a concrete pipe. A grating across the mouth has caught a season of rubbish: branches, a traffic cone, twisted metal.',
    ],
    choices: [
      {
        id: 'pry',
        label: 'pull the metal free',
        effects: [{ grant: { scrap: [1, 3] } }, { log: 'It comes away with a shriek. Useful shapes, some of it.' }],
      },
      { id: 'on', label: 'leave it', effects: [] },
    ],
  },
  {
    id: 'creek-shoe',
    title: 'A shoe',
    text: [
      'A child’s shoe, wedged between two stones in the shallows. The laces are still tied in a double bow.',
    ],
    choices: [
      {
        id: 'take',
        label: 'pick it up',
        effects: [{ log: 'You carry it for a while. Then you set it on a stump, facing the water.' }],
      },
      { id: 'leave', label: 'walk past', effects: [{ log: 'You walk past. You are aware of walking past.' }] },
    ],
  },
  {
    id: 'creek-thermos',
    title: 'Something in the gravel',
    text: [
      'Half buried in the gravel bar: a steel flask, green, dented at the shoulder.',
      'Your hand closes on it before you have decided to pick it up. Your thumb finds the worn place and fits.',
    ],
    choices: [{ id: 'hold', label: 'turn it over', effects: [{ memory: 'thermos' }] }],
  },
];

const HIGHWAY = [
  {
    id: 'highway-cars',
    title: 'Three cars',
    text: [
      'Three cars stopped nose to tail in the slow lane, every door open. No bags. No blood. Just the doors, and leaves blown into the footwells.',
    ],
    choices: [
      {
        id: 'dash',
        label: 'go through the glove boxes',
        effects: [
          { grant: { scrap: [1, 2] } },
          { roll: 0.5, pass: [{ grant: { batteries: 1 } }] },
          { log: 'Maps, sunglasses, a torch with the cells still in it or not.' },
        ],
      },
      {
        id: 'boot',
        label: 'force the boots',
        effects: [
          { grant: { cloth: [1, 2] } },
          { roll: 0.4, pass: [{ grant: { rations: [1, 2] } }] },
          { log: 'Coats. A picnic blanket. Somebody packed for a day out.' },
        ],
      },
    ],
  },
  {
    id: 'highway-truck',
    title: 'The truck',
    text: [
      'A delivery truck lies on its side across two lanes. The cargo door has buckled, leaving a gap the width of your shoulders.',
    ],
    choices: [
      {
        id: 'axe',
        label: 'open it with the axe',
        tools: ['axe'],
        effects: [
          { grant: { scrap: 2, cloth: 2, rations: [1, 3] } },
          { log: 'The door gives on the fourth blow. Inside: crushed boxes, and a few that are not.', tone: 'good' },
        ],
      },
      {
        id: 'squeeze',
        label: 'squeeze through the gap',
        hint: 'sharp edges',
        effects: [
          {
            roll: 0.6,
            pass: [{ grant: { rations: 2, cloth: 1 } }, { log: 'You come out backwards, dragging what you could reach.' }],
            fail: [{ vital: { health: -0.12 } }, { log: 'The metal opens your forearm. You get nothing.', tone: 'warn' }],
          },
        ],
      },
      { id: 'on', label: 'walk around it', effects: [] },
    ],
  },
  {
    id: 'highway-sign',
    title: 'The sign',
    text: [
      'An overhead gantry, still legible: EVACUATION ROUTE EAST. Wired beneath it, a sheet of plywood with painted letters a foot high.',
      'DON’T. THEY SAID STAY.',
    ],
    choices: [
      {
        id: 'wire',
        label: 'cut the board down for its wire',
        effects: [{ grant: { wire: [1, 2] } }, { log: 'The board falls face down. You coil the wire and do not turn it over.' }],
      },
      { id: 'read', label: 'read it again', effects: [{ log: 'You read it until the letters stop being words.' }] },
    ],
  },
  {
    id: 'highway-walker',
    title: 'A walker',
    text: [
      'Someone is on the centre line a quarter mile ahead, walking away from you with a bag over one shoulder. They have not seen you.',
    ],
    choices: [
      {
        id: 'call',
        label: 'call out',
        effects: [
          { grant: { medicine: 1 } },
          {
            log: 'They stop dead at the sound of your voice. Then they run, and something falls from the bag. They do not come back for it.',
          },
        ],
      },
      { id: 'let', label: 'let them go', effects: [{ log: 'You stand still until they are a dot, and then nothing.' }] },
    ],
  },
  {
    id: 'highway-overpass',
    title: 'The overpass',
    text: [
      'From the overpass you can see the whole road, east to the gap in the hills.',
      'You count the cars. It does not take long.',
    ],
    choices: [{ id: 'look', label: 'keep looking', effects: [{ memory: 'road' }] }],
  },
];

const SUBURB = [
  {
    id: 'suburb-boat',
    title: 'The street',
    text: [
      'The street is a canal. Roofs stand out of brown water like upturned hulls. A rowing boat is tied to a chimney by a length of washing line.',
    ],
    choices: [
      {
        id: 'boat',
        label: 'take the boat',
        effects: [
          {
            roll: 0.7,
            pass: [{ grant: { cloth: 2, scrap: 2 } }, { log: 'You pole from gutter to gutter, lifting what floats.', tone: 'good' }],
            fail: [{ vital: { warmth: -0.25 } }, { log: 'The boat is rotten. You go in to the neck.', tone: 'warn' }],
          },
        ],
      },
      {
        id: 'wade',
        label: 'wade the shallows',
        hint: 'cold, but sure',
        effects: [
          { vital: { warmth: -0.1 } },
          { grant: { scrap: [1, 2] } },
          { log: 'Thigh deep, feeling for the kerb with your feet.' },
        ],
      },
    ],
  },
  {
    id: 'suburb-attic',
    title: 'An attic',
    text: [
      'A dormer window stands open a foot above the water. Inside it is dry, and somebody lived here a while: bedding, a camp stove, tally marks on a rafter. Thirty-one of them.',
    ],
    choices: [
      {
        id: 'search',
        label: 'take what they left',
        effects: [
          { grant: { cloth: [2, 3] } },
          { roll: 0.5, pass: [{ grant: { medicine: 1 } }] },
          { roll: 0.4, pass: [{ grant: { batteries: 1 } }] },
          { log: 'You strip the bed and go through the boxes. You do not count the marks again.' },
        ],
      },
      { id: 'leave', label: 'leave it as it is', effects: [{ log: 'You pull the window to behind you.' }] },
    ],
  },
  {
    id: 'suburb-shop',
    title: 'The corner shop',
    text: [
      'A corner shop, flooded to the third shelf. The top shelves are above it, and nobody has been tall enough or desperate enough to clear them.',
    ],
    choices: [
      {
        id: 'climb',
        label: 'climb the shelving',
        effects: [
          { grant: { rations: [1, 3] } },
          { roll: 0.5, pass: [{ grant: { batteries: 1 } }] },
          { log: 'Tins with the labels soaked off. You take them on faith.' },
        ],
      },
    ],
  },
  {
    id: 'suburb-garage',
    title: 'A garage',
    text: [
      'A garage on a rise, its door half up. Tools on a pegboard, each one outlined in marker pen so it could be put back in its place.',
    ],
    choices: [
      {
        id: 'tools',
        label: 'empty the pegboard',
        effects: [{ grant: { scrap: [2, 4] } }, { log: 'You leave the outlines.' }],
      },
      {
        id: 'cable',
        label: 'strip the wiring',
        effects: [{ grant: { wire: [1, 2] } }, { log: 'You pull cable out of the wall hand over hand.' }],
      },
    ],
  },
  {
    id: 'suburb-house',
    title: 'Number nineteen',
    text: [
      'You have stopped in front of a house and you do not know why this one. Brick, a porch, a silted bicycle against the fence.',
      'Your feet know the path. They take the two steps up without looking for them.',
    ],
    choices: [{ id: 'in', label: 'go in', effects: [{ memory: 'sill' }] }],
  },
  {
    id: 'suburb-doorframe',
    title: 'The hallway',
    text: [
      'Number nineteen again. This time you go further in, down the hall, through water to your shins.',
      'There is pencil on the frame of the second door.',
    ],
    choices: [{ id: 'look', label: 'look closer', effects: [{ memory: 'marks' }] }],
  },
];

const HOSPITAL = [
  {
    id: 'hospital-ward',
    title: 'A ward',
    text: [
      'A long ward. Twenty beds, made, corners square, a folded blanket at the foot of each. Nobody ever lay in them.',
    ],
    choices: [
      {
        id: 'blankets',
        label: 'take the blankets',
        effects: [{ grant: { cloth: [2, 3] } }, { log: 'You roll as many as you can carry. They smell of nothing at all.' }],
      },
    ],
  },
  {
    id: 'hospital-dispensary',
    title: 'The dispensary',
    text: [
      'A steel cage across a counter, padlocked. Behind it, shelves of white boxes in rows. Someone has tried the lock with a fire extinguisher and given up.',
    ],
    choices: [
      {
        id: 'axe',
        label: 'break the hasp with the axe',
        tools: ['axe'],
        effects: [{ grant: { medicine: [2, 3] } }, { log: 'Stone on steel, again and again, until the hasp shears.', tone: 'good' }],
      },
      {
        id: 'reach',
        label: 'reach through the bars',
        effects: [
          { grant: { medicine: 1 } },
          { roll: 0.3, pass: [{ vital: { health: -0.08 } }, { log: 'You skin your arm to the elbow getting it back out.', tone: 'warn' }] },
          { log: 'Your fingertips drag one box to the edge. One.' },
        ],
      },
    ],
  },
  {
    id: 'hospital-basement',
    title: 'The stairs down',
    text: [
      'Stairs going down, and black water at the fourth step. A sign on the wall: PLANT ROOM. GENERATOR.',
    ],
    choices: [
      {
        id: 'wade',
        label: 'wade in with the torch held high',
        effects: [
          {
            roll: 0.6,
            pass: [{ grant: { batteries: [1, 2], wire: 2 } }, { log: 'Chest deep, you strip the starter cells and a loom of cable.', tone: 'good' }],
            fail: [
              { vital: { health: -0.12, warmth: -0.2 } },
              { log: 'Something under the water takes your legs from you. You come up choking.', tone: 'warn' },
            ],
          },
        ],
      },
      { id: 'stay', label: 'stay dry', effects: [] },
    ],
  },
  {
    id: 'hospital-corridor',
    title: 'The corridor',
    text: [
      'The torch gutters. At the far end of the corridor something shifts its weight, and a trolley rolls an inch and stops.',
    ],
    choices: [
      {
        id: 'on',
        label: 'go on',
        effects: [
          {
            roll: 0.55,
            pass: [{ grant: { medicine: 1, scrap: 2 } }, { log: 'A dog, starved to a frame. It lets you pass. Past it, a supply room.' }],
            fail: [{ vital: { health: -0.2 } }, { log: 'It comes at you low and fast. You get the door shut with your arm still in its mouth.', tone: 'danger' }],
          },
        ],
      },
      { id: 'back', label: 'back away', effects: [{ log: 'You walk backwards the whole length of the corridor.' }] },
    ],
  },
  {
    id: 'hospital-station',
    title: 'The nurses’ station',
    text: [
      'A curved desk, a dead telephone, a radio with its aerial pulled out to full length and bent toward the window.',
      'Something is cable-tied to the edge of the desk, where a person sitting there could not help but see it.',
    ],
    choices: [
      {
        id: 'read',
        label: 'bring the torch closer',
        effects: [
          {
            memory: 'script',
            then: [
              { flag: 'loc-relay' },
              { log: 'Harrow Hill. You know the way. You have always known the way.', tone: 'memory' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'hospital-bay',
    title: 'The ambulance bay',
    text: [
      'The bay is painted with coach-sized rectangles, numbered in yellow. A folding table. A megaphone. A clipboard on a string, turning in the draught.',
    ],
    choices: [{ id: 'read', label: 'read the clipboard', effects: [{ memory: 'buses' }] }],
  },
];

const RELAY = [
  {
    id: 'relay-fence',
    title: 'The fence',
    text: [
      'Chain-link, three metres high, the gate chained. A sign: COUNTY EMERGENCY COMMUNICATIONS. AUTHORISED STAFF ONLY.',
    ],
    choices: [
      {
        id: 'cut',
        label: 'cut a way through',
        tools: ['knife'],
        effects: [{ grant: { wire: [2, 3] } }, { log: 'You work the links apart one at a time and keep what you cut.' }],
      },
      {
        id: 'climb',
        label: 'climb it',
        effects: [
          { roll: 0.3, pass: [{ vital: { health: -0.1 } }, { log: 'You come down badly on the far side.', tone: 'warn' }] },
          { log: 'Over the top. Your hands remember the cold of this gate.' },
        ],
      },
    ],
  },
  {
    id: 'relay-stores',
    title: 'The store cupboard',
    text: [
      'A cupboard off the corridor. Printer paper, a first-aid box, a case of long-life meals with a note taped to it: NIGHTS ONLY. HANDS OFF.',
    ],
    choices: [
      {
        id: 'take',
        label: 'take all of it',
        effects: [
          { grant: { rations: 2, batteries: [1, 2] } },
          { roll: 0.5, pass: [{ grant: { medicine: 1 } }] },
          { log: 'The note is in your handwriting.' },
        ],
      },
    ],
  },
  {
    id: 'relay-racks',
    title: 'The racks',
    text: [
      'Equipment racks to the ceiling, most of them dark. The boards slide out on runners, each one labelled in a neat hand.',
    ],
    choices: [
      {
        id: 'pull',
        label: 'pull the boards you can carry',
        effects: [{ grant: { parts: [1, 2], scrap: 1 } }, { log: 'You know which ones matter. You do not stop to ask how.' }],
      },
    ],
  },
  {
    id: 'relay-roof',
    title: 'The roof',
    text: [
      'A ladder to the roof. Solar panels, grey with ash, and the mast itself going up into cloud. From here you can see the whole valley, and no lights in it.',
    ],
    choices: [
      {
        id: 'strip',
        label: 'strip the spare feed line',
        effects: [{ grant: { wire: 2, parts: 1 } }, { log: 'You coil the cable over your shoulder.' }],
      },
      {
        id: 'clean',
        label: 'wipe the panels clean',
        hint: 'you are not sure why',
        effects: [{ log: 'You clean every panel with your sleeve. Somewhere below, a fan spins a little faster.' }],
      },
    ],
  },
  {
    id: 'relay-booth',
    title: 'A room with no windows',
    text: [
      'A red lamp over a door, unlit. Behind the door, a small room: a desk, a microphone on an arm, a chair that leans.',
      'You sit down in the chair. It leans exactly as far as you expect.',
    ],
    choices: [
      {
        id: 'look',
        label: 'look around the booth',
        effects: [{ memory: 'booth', then: [{ flag: 'radio-idea' }] }],
      },
    ],
  },
  {
    id: 'relay-tray',
    title: 'The printer tray',
    text: [
      'The booth again. You have been avoiding the corner with the teleprinter in it. There is paper in the tray, curled and yellowed.',
    ],
    choices: [{ id: 'read', label: 'read it', effects: [{ memory: 'daythree' }] }],
  },
  {
    id: 'relay-machine',
    title: 'The machine room',
    text: [
      'One rack in the machine room is still lit. Two reels turn behind glass. A monitor speaker, turned low, is saying something over and over.',
      'You know the voice.',
    ],
    choices: [
      {
        id: 'off',
        label: 'listen, then switch it off',
        effects: [
          {
            memory: 'loop',
            then: [
              { grant: { parts: 2 } },
              { log: 'You stop the reels with your hand. You take the exciter board with you. The valley is quiet for the first time.' },
            ],
          },
        ],
      },
      {
        id: 'leave',
        label: 'listen, and leave it running',
        effects: [
          {
            memory: 'loop',
            then: [{ log: 'You cannot make your hand do it. Behind you, it goes on telling no one to stay.' }],
          },
        ],
      },
    ],
  },
];

export const ENCOUNTERS = [...CREEK, ...HIGHWAY, ...SUBURB, ...HOSPITAL, ...RELAY];
