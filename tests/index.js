/**
 * Entry point for `node --test tests/`.
 *
 * Node 22 resolves a directory argument to its index file rather than searching
 * it for tests, so this file loads every suite beside it. Each suite can also be
 * run on its own: `node --test tests/api.test.mjs`.
 */
import { readdirSync } from 'node:fs';

const suites = readdirSync(new URL('.', import.meta.url))
  .filter((name) => name.endsWith('.test.mjs'))
  .sort();

for (const suite of suites) await import(`./${suite}`);
