import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, describe, it } from 'node:test';

import { REPOSITORY_ROOT } from '../paths.mts';
import { runFolderName, writeResult } from '../results.mts';
import type { RunResult } from '../results.mts';

const FOLDER = path.join(
  REPOSITORY_ROOT,
  '.tmp',
  'benchmarks',
  'tests',
  `results-${process.pid}`
);

after(() => fs.rmSync(FOLDER, { recursive: true, force: true }));

describe('runFolderName', () => {
  it('starts with the local date and time and ends with the run name', () => {
    assert.equal(
      runFolderName(new Date(2026, 10, 2, 9, 5), 'sync-props'),
      '2026-11-02-0905-sync-props'
    );
  });
});

describe('writeResult', () => {
  it('stops instead of writing a number that is not finite', () => {
    fs.mkdirSync(FOLDER, { recursive: true });
    const result = {
      status: 'running',
      statistics: [{ difference: Number.POSITIVE_INFINITY }],
    } as unknown as RunResult;
    assert.throws(
      () => writeResult(FOLDER, result),
      /The result field "difference" is Infinity, not a finite number/
    );
    assert.equal(fs.existsSync(path.join(FOLDER, 'result.json')), false);
  });
});
