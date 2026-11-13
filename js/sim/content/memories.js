import { indexById } from '../util.js';

/**
 * The player's past, in the order it should be read. Fragments are found out of
 * order across the camp and the ruins; together they are the answer to the fugue.
 *
 * @typedef {object} MemoryDef
 * @property {string} id
 * @property {string} title
 * @property {string[]} text  paragraphs
 */

/** @type {MemoryDef[]} */
export const MEMORIES = [
  {
    id: 'name',
    title: 'A name',
    text: [
      'You open your mouth and a name is there, ready, warm from use.',
      'Tess.',
      'It is not your name. You know that the way you know your own hand. It is a name you have said ten thousand times: across a house, up a staircase, into a telephone. You do not know whose it is.',
    ],
  },
  {
    id: 'thermos',
    title: 'The thermos',
    text: [
      'A steel thermos, green paint worn silver where a hand goes. You had one. You filled it at ten each night and it was empty by four.',
      'Nights, then. You worked nights. A small room with no windows, a chair that leaned, a red light over the door.',
      'You talked in that room. For hours. You cannot remember anyone talking back.',
    ],
  },
  {
    id: 'road',
    title: 'The empty road',
    text: [
      'Four lanes out of the valley and almost nothing on them. A few cars, doors open. No jam. No miles of stalled metal.',
      'You remember standing somewhere high and looking at this same road while the sky browned over, and thinking what you are thinking now. Where is everyone? Why aren’t they leaving?',
      'And under that thought another one, quick and cold, that you did not let yourself finish.',
    ],
  },
  {
    id: 'sill',
    title: 'The kitchen sill',
    text: [
      'You know which house before you can read the number. The waterline is above the kitchen window. Inside, the sill is furred with silt, except for one clean rectangle the size of a paperback.',
      'A radio sat there. Yellow, with a crank on the side for when the power went. You bought it. You set the dial yourself and put a strip of tape across it so it could not be moved.',
      '“So you can always hear me,” you said.',
      'The radio is gone. Someone lifted it off the sill, after the water. You stand there a long time on that.',
    ],
  },
  {
    id: 'marks',
    title: 'Height marks',
    text: [
      'Pencil lines on a doorframe, climbing. Dates beside them, in a hand you recognise because it is yours. The lowest is at your knee. The highest reads: Tess, 9.',
      'There is no line above it.',
      'You had a daughter. You have a daughter. You do not know which of those is true. You put your palm flat on the highest mark and it is cold and it tells you nothing.',
    ],
  },
  {
    id: 'script',
    title: 'The card',
    text: [
      'A laminated card, cable-tied to the nurses’ station. SHELTER-IN-PLACE ADVISORY. READ VERBATIM. DO NOT PARAPHRASE.',
      'You do not need to read it. “Remain where you are. Close windows and doors. Do not attempt to travel. Help is being arranged.” You know where the breaths go. You know to drop your voice on arranged, so it sounds like a thing already done.',
      'You have said these words more often than you have said your own name. At the foot of the card, in small type: County Relay 4, Harrow Hill.',
    ],
  },
  {
    id: 'buses',
    title: 'The coaches',
    text: [
      'A clipboard in the ambulance bay. Evacuation transport: forty coaches, fifty seats each. Someone logged every departure in careful block capitals.',
      'Coach 1: 11 aboard. Coach 2: 6. Coach 3: 9. Coach 4: 4.',
      'It goes on like that down the page. The last dozen left empty, to keep the schedule. Two thousand seats, and the town stayed home with its windows shut, because a calm voice on the radio told it to.',
    ],
  },
  {
    id: 'voice',
    title: 'The voice',
    text: [
      'One of them knew your voice before they knew your face.',
      '“It’s you. From the radio. We kept it on for nine days. My mother said, listen to that one, that one sounds like they know.”',
      'Nobody at the fire moved away from you. That was the worst of it. They only looked, the way you look at a house you used to live in.',
    ],
  },
  {
    id: 'booth',
    title: 'The booth',
    text: [
      'The chair still leans. Your mug is on the desk with a skin of dust in it. On the wall, the sign-in sheet: nine days of the same signature, yours, top to bottom. The relief operator’s column is blank after the second day.',
      'No one came to take over. You remember understanding that, around the fourth night, and pulling the microphone closer anyway.',
      'There is a photograph taped under the desk lamp. A girl with a gap in her teeth, holding up a yellow radio like a trophy.',
    ],
  },
  {
    id: 'daythree',
    title: 'Day three',
    text: [
      'A printout, curled in the tray, dated the third day. ADVISORY SUPERSEDED. FIRE LINE HAS TURNED. ROADS EAST OPEN UNTIL FURTHER NOTICE. INSTRUCT ALL LISTENERS TO EVACUATE.',
      'You had forgotten the paper. You have not forgotten reading it. You remember doing the sum: ninety thousand people, one road, forty coaches. You remember the county supervisor on the line saying, if you tell them all to run, nobody gets out. Keep them calm. Keep them home.',
      'You could have put the phone down. You said: understood. Then you leaned in to the microphone and read the old card again, and you read it well.',
    ],
  },
  {
    id: 'loop',
    title: 'The loop',
    text: [
      'You called the house that same night. She picked up on the first ring. You could have said run. You said: “Do what the radio says, bird. Stay inside. I’ll come and get you myself when my shift is over.”',
      'Nobody came to end your shift. On the ninth day you recorded the card one last time, set the machine to repeat, and went out to the car.',
      'The rack is still lit, fed by the panels on the roof. The reels still turn. Your voice comes out of the monitor, patient and warm, into a valley with no one in it. It has said the same four sentences every ninety seconds since you left.',
    ],
  },
  {
    id: 'walk',
    title: 'The walk',
    text: [
      'The road to the house ended a mile short, at water. The reservoir had gone on the sixth day; nobody told the radio. You waded until you were swimming, and swam until you could put your hand on your own roof.',
      'You called her name until your voice went. That voice. Then you walked uphill into the trees and kept walking, and somewhere among them you set the whole of it down: the booth, the card, the call, your name.',
      'You did not lose your memory. You put it down. Tonight, by this fire, you have picked all of it up again, and it weighs exactly what it weighed.',
    ],
  },
];

export const MEMORY_BY_ID = indexById(MEMORIES);
