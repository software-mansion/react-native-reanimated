import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { describe, it } from 'node:test';

import { globSync } from 'glob';

import { simulate } from '../index';

const SNIPPETS_DIR = join(__dirname, '..', 'snippets');

describe('docs snippets', () => {
  const files = globSync('*.{js,jsx}', {
    cwd: SNIPPETS_DIR,
    absolute: true,
  }).sort();
  assert.ok(files.length > 0, 'no snippets found');

  for (const file of files) {
    it(`${basename(file)} simulates to completion`, () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const snapshots = simulate(require(file), readFileSync(file, 'utf8'));
      const last = snapshots[snapshots.length - 1];
      assert.equal(last.finished, true);
      assert.ok(
        last.cores.every((core) => core.status !== 'error'),
        `error in ${basename(file)}: ${last.cores.map((core) => core.error).join(', ')}`
      );
    });
  }
});
