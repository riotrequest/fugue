/**
 * Seeded random numbers (mulberry32). The generator keeps no state of its own:
 * it reads and writes `state.rng`, so a save captures the exact stream position
 * and a restored game continues with the same rolls.
 *
 * @typedef {ReturnType<typeof createRng>} Rng
 * @param {{ rng: number }} state
 */
export function createRng(state) {
  const float = () => {
    state.rng = (state.rng + 0x6d2b79f5) >>> 0;
    let t = state.rng;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (low, high) => low + Math.floor(float() * (high - low + 1));

  return {
    /** Uniform in [0, 1). */
    float,
    /** Uniform integer in [low, high], both inclusive. */
    int,
    /** Uniform in [low, high). */
    range: (low, high) => low + float() * (high - low),
    chance: (probability) => float() < probability,
    pick: (list) => list[int(0, list.length - 1)],
    /** Picks one entry with probability proportional to `weightOf(entry)`. */
    weighted(list, weightOf) {
      const total = list.reduce((sum, entry) => sum + weightOf(entry), 0);
      let roll = float() * total;
      for (const entry of list) {
        roll -= weightOf(entry);
        if (roll < 0) return entry;
      }
      return list[list.length - 1];
    },
    /** Fisher–Yates on a copy. */
    shuffle(list) {
      const copy = list.slice();
      for (let i = copy.length - 1; i > 0; i--) {
        const j = int(0, i);
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    },
    /** Rounds to a neighbouring integer so that the expected value equals `value`. */
    round(value) {
      const whole = Math.floor(value);
      return whole + (float() < value - whole ? 1 : 0);
    },
  };
}
