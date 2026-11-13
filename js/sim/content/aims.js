/**
 * What the camp can work toward once it is out of danger: long-term aims, each
 * a condition (systems/conditions.js). The first time one holds it is marked
 * with the flag `aim:<id>`, logged and chronicled (systems/aims.js), and the
 * notebook lists them all, so a long game always has somewhere to go.
 *
 * @typedef {object} AimDef
 * @property {string} id
 * @property {string} title
 * @property {string} hint      how to get there
 * @property {object} when
 * @property {string} done      logged when it is achieved
 */

/** @type {AimDef[]} */
export const AIMS = [
  {
    id: 'full-house',
    title: 'A full fire',
    hint: 'twelve survivors at the fire',
    when: { popMin: 12 },
    done: 'Every bed in camp is taken. Twelve voices at supper, and yours.',
  },
  {
    id: 'trusted',
    title: 'A camp that trusts you',
    hint: 'at least six survivors, and three in four of them loyal',
    when: { popMin: 6, loyalShare: 0.75 },
    done: 'Somebody asks your opinion and then actually does what you said. Then somebody else does.',
  },
  {
    id: 'friendships',
    title: 'Friends at the fire',
    hint: 'three friendships or partnerships in camp',
    when: { bondsMin: { any: 3 } },
    done: 'The camp is not a collection of strangers any more. People save each other seats.',
  },
  {
    id: 'scholars',
    title: 'A full notebook',
    hint: 'work out eight projects in the notebook',
    when: { researchMin: 8 },
    done: 'The notebook is nearly full, and somebody has started a second one.',
  },
  {
    id: 'builders',
    title: 'A settlement',
    hint: 'twenty structures standing',
    when: { builtMin: 20 },
    done: 'From the ridge, the camp looks like a village. You would not have believed it, last winter.',
  },
  {
    id: 'remembered',
    title: 'Everything remembered',
    hint: 'recover all twelve memories',
    when: { memoriesMin: 12 },
    done: 'You know who you were now. All of it. You are still deciding what to do about that.',
  },
  {
    id: 'neighbours',
    title: 'Neighbours',
    hint: 'make contact with the people across the valley',
    when: { flags: ['neighbours'] },
    done: 'There are other people out there keeping fires, and they know your name. Or the camp’s, at least.',
  },
  {
    id: 'beyond',
    title: 'Beyond the valley',
    hint: 'climb to the pass and see what lies past it',
    when: { flags: ['seen-beyond'] },
    done: 'There are lights beyond the pass. The world did not end everywhere. Only here, and only for a while.',
  },
  {
    id: 'stories',
    title: 'Stories told',
    hint: 'see three survivors’ own stories through',
    when: { arcsMin: 3 },
    done: 'Everyone at the fire has a story, and some of them you know the ends of.',
  },
  {
    id: 'two-winters',
    title: 'Two winters',
    hint: 'live through a second winter',
    when: { yearMin: 3 },
    done: 'Two winters. A year. You are still here.',
  },
];
