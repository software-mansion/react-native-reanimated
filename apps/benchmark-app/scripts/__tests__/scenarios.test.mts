import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import { SCENARIOS } from '../scenarios.mts';

const REGISTRY = path.join(
  import.meta.dirname,
  '..',
  '..',
  'src',
  'scenarios',
  'registry.ts'
);

describe('SCENARIOS', () => {
  it('lists the scenario names of the app registry in the same order', () => {
    const source = fs.readFileSync(REGISTRY, 'utf8');
    const names = [...source.matchAll(/\bname: '([^']+)'/g)].map(
      (match) => match[1]
    );
    assert.deepEqual(names, [...SCENARIOS]);
  });
});
