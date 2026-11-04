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
    const expectedCrash = basename(file) === 'returningCallbackCrash.js';
    it(`${basename(file)} ${expectedCrash ? 'stops at the invalid state update' : 'simulates to completion'}`, () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const snapshots = simulate(require(file), readFileSync(file, 'utf8'), {
        durationTicks: 300,
        bundleMode: basename(file) === 'callTableBundleMode.js',
      });
      const last = snapshots[snapshots.length - 1];
      assert.ok(last.finished || snapshots.length === 301);
      if (expectedCrash) {
        const errors = snapshots.flatMap((snapshot) =>
          snapshot.events.filter((event) => event.type === 'error')
        );
        assert.equal(errors.length, 1);
        assert.equal(errors[0].core, 'worker:worker');
        assert.equal(
          errors[0].message,
          '[Worklets] Tried to synchronously call a Remote Function. Called "setState" on the worker Runtime.\nSee https://docs.swmansion.com/react-native-worklets/docs/guides/troubleshooting#tried-to-synchronously-call-a-remote-function for more details.'
        );
        assert.match(
          last.cores.find((core) => core.id === errors[0].core)!.error!,
          /Use scheduleOnRN/
        );
        assert.match(
          readFileSync(file, 'utf8').split('\n')[errors[0].line! - 1],
          /yield setState\(result\)/
        );
        assert.equal(last.finished, true);
        assert.equal(
          last.cores.find((core) => core.id === errors[0].core)?.line,
          errors[0].line
        );
        assert.deepEqual(
          last.cores
            .filter((core) => core.status === 'error')
            .map((core) => core.id),
          ['worker:worker']
        );
        return;
      }
      assert.ok(
        last.cores.every((core) => core.status !== 'error'),
        `error in ${basename(file)}: ${last.cores.map((core) => core.error).join(', ')}`
      );
    });
  }
});
