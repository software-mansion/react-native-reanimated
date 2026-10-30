import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { describe, it } from 'node:test';

import { globSync } from 'glob';

import { simulate } from '../index';

const ROOT = join(__dirname, '..', '..', '..');

describe('docs snippets', () => {
  const files = globSync(
    ['src/simulation/snippets/*.{js,jsx}', 'docs/**/_*/*.{js,jsx}'],
    { cwd: ROOT, absolute: true }
  ).sort();
  assert.ok(files.length > 0, 'no snippets found');

  for (const file of files) {
    it(`${basename(file)} simulates to completion`, () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const snapshots = simulate(require(file), readFileSync(file, 'utf8'), {
        durationTicks: 300,
      });
      const last = snapshots[snapshots.length - 1];
      assert.ok(last.finished || snapshots.length === 301);
      assert.ok(
        last.cores.every((core) => core.status !== 'error'),
        `error in ${basename(file)}: ${last.cores.map((core) => core.error).join(', ')}`
      );
    });
  }
});
