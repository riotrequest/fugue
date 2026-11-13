/**
 * Minimal synchronous pub/sub used to tell the outside world (UI, audio) what happened.
 * The simulation never listens to its own events; state is the only source of truth.
 */
export function createEmitter() {
  /** @type {Map<string, Set<Function>>} */
  const listeners = new Map();

  return {
    /** @returns {() => void} unsubscribe */
    on(type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(fn);
      return () => listeners.get(type).delete(fn);
    },
    emit(type, payload) {
      for (const fn of listeners.get(type) ?? []) fn(payload);
    },
  };
}
