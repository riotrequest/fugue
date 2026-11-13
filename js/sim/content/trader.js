/**
 * Words for the travelling trader, who comes by in daylight every few days with
 * a few random deals (see systems/trade.js).
 */

/** How a visit opens. */
export const TRADER_PITCHES = [
  'A woman with a handcart comes up the creek path in broad daylight, one hand raised and empty. She stops at the edge of the clearing. “Trading,” she says. “Not staying.”',
  'A man in a long coat sewn all over with pockets. He spreads a tarp on the ground and lays things out on it one at a time, as if you were already haggling.',
  'Two of them, with a dog and a sledge piled under a sheet. The older one does the talking. The younger one watches the trees.',
  'Someone whistles from the treeline, the way you would to a neighbour. Their pack is nearly as big as they are. “I go between camps,” they say. “I have a bit of everything.”',
  'The trader again, or one very like the last: the same careful hands, the same tarp. “Same rules,” they say. “Fair trades, and I leave before dark.”',
];

/** After a deal, while there is more on the tarp. */
export const TRADER_AGAIN = [
  'The trader stows your goods and smooths the tarp. “Anything else?”',
  'A nod: fair enough. There is still a little laid out on the tarp.',
  'The trader waits, in no hurry at all, while you look over what is left.',
];

/** Sending the trader on. */
export const TRADER_PARTING = [
  'The trader packs up without hurry and is gone down the creek path.',
  'The tarp is rolled, the pack shouldered. “Keep that fire going,” the trader says, and goes.',
  'You watch the trader out of sight. Someone else out there is still getting by.',
];

/** When everything on the tarp has been traded. */
export const TRADER_BARE = [
  'The tarp is bare. The trader rolls it up, pleased, and is gone before the light turns.',
  '“Cleaned me out,” the trader says, and seems glad of it. They leave by the creek path.',
];
