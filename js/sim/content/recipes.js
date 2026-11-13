/**
 * Things the player makes by hand. Each recipe yields one unit of the gear resource
 * with the same id. Passive bonuses (`caps`, `warmth`, `haul`) apply while it is owned;
 * other gear matters because yields, recipes and choices name it as a tool.
 *
 * @typedef {object} RecipeDef
 * @property {string} id          gear resource produced
 * @property {string} label       action label
 * @property {string} hint
 * @property {Record<string, number>} cost
 * @property {string[]} [tools]   gear needed but not used up
 * @property {object} [when]      condition for the recipe to be known
 * @property {boolean} [repeatable]  can be made again, up to its cap (consumables, and work tools for the crew)
 * @property {string} done        log line on completion
 * @property {Record<string, number>} [caps]  storage raised while owned
 * @property {number} [warmth]    added to the comfort level while owned
 * @property {number} [haul]      extra share of salvage carried back from expeditions
 */

/** @type {RecipeDef[]} */
export const RECIPES = [
  {
    id: 'axe',
    label: 'lash a stone axe',
    hint: 'twice the wood for you; make more, one per woodcutter',
    cost: { wood: 2, stone: 2, fiber: 2 },
    when: { chapterMin: 2 },
    repeatable: true,
    done: 'A wedge of stone, a split branch, a lot of cord. It bites.',
  },
  {
    id: 'knife',
    label: 'knap a knife',
    hint: 'an edge, for skinning and finer work; one per trapper',
    cost: { stone: 2, fiber: 1 },
    when: { chapterMin: 2 },
    repeatable: true,
    done: 'You strike flakes from the stone until one of them is a blade.',
  },
  {
    id: 'spear',
    label: 'shape a spear',
    hint: 'to hunt with, and to stand behind; every hunter needs one',
    cost: { wood: 2, stone: 1, fiber: 2 },
    tools: ['knife'],
    when: { built: ['workbench'] },
    repeatable: true,
    done: 'You harden the point in the coals. It has a good weight.',
  },
  {
    id: 'waterskin',
    label: 'stitch a water skin',
    hint: 'carry and keep more water; one per water carrier',
    cost: { hide: 2, fiber: 2 },
    tools: ['knife'],
    when: { built: ['workbench'] },
    repeatable: true,
    done: 'The seams weep a little, then swell and hold.',
    caps: { water: 4 },
  },
  {
    id: 'pot',
    label: 'fire a clay pot',
    hint: 'for stew: meat, roots and water go further together',
    cost: { stone: 4, wood: 3, fiber: 1 },
    when: { built: ['workbench'] },
    done: 'Creek clay, coiled and smoothed, baked in the coals overnight. It rings when you tap it.',
  },
  {
    id: 'torch',
    label: 'bind a torch',
    hint: 'light to carry into dark places',
    cost: { wood: 1, fiber: 1, tinder: 1 },
    when: { built: ['workbench'] },
    repeatable: true,
    done: 'Bark and cord wound tight around a green stick.',
  },
  {
    id: 'pack',
    label: 'sew a pack',
    hint: 'bring more back from the ruins',
    cost: { cloth: 3, fiber: 3 },
    tools: ['knife'],
    when: { built: ['workbench'] },
    done: 'Two straps and a deep pocket. It sits well on your back.',
    haul: 0.5,
  },
  {
    id: 'coat',
    label: 'sew a hide coat',
    hint: 'the cold reaches you more slowly',
    cost: { hide: 3, cloth: 2 },
    tools: ['knife'],
    when: { built: ['workbench'] },
    done: 'It smells of smoke and animal. It is the warmest thing you own.',
    warmth: 0.12,
  },
];
