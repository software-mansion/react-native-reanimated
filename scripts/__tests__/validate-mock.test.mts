import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { describe, it } from 'node:test';

const SCRIPT_PATH = path.resolve(
  import.meta.dirname,
  '..',
  'validate-mock.mts'
);
const FIXTURES_DIR = path.join(
  import.meta.dirname,
  '__fixtures__',
  'validateMock'
);
const DEFAULT_ARGS = [
  '--source',
  'src/index.ts',
  '--mock',
  'src/mock.ts',
  '--tsConfig',
  '../tsconfig.json',
];

function runValidateMock(fixture: string, args: string[] = DEFAULT_ARGS) {
  return spawnSync(
    process.execPath,
    ['--experimental-strip-types', SCRIPT_PATH, ...args],
    { cwd: path.join(FIXTURES_DIR, fixture), encoding: 'utf8' }
  );
}

describe('validate-mock', () => {
  const covered = runValidateMock('covered');
  const missing = runValidateMock('missing');
  const stale = runValidateMock('stale');
  const noArguments = runValidateMock('covered', []);

  it('passes when the mock covers all value exports', () => {
    assert.ok(
      covered.stdout.includes(
        'All value exports of src/index.ts are present in src/mock.ts.'
      )
    );
    assert.ok(!covered.stdout.includes('Present in'));
    assert.equal(covered.status, 0);
  });

  it('skips type exports and type-only exports', () => {
    assert.ok(!covered.stdout.includes('Baz'));
    assert.ok(!covered.stdout.includes('Kind'));
  });

  it('fails and lists mock properties that are not exported', () => {
    assert.ok(
      stale.stdout.includes(
        'Present in src/mock.ts but not exported from src/index.ts (1):'
      )
    );
    assert.ok(stale.stdout.includes('- stale'));
    assert.equal(stale.status, 1);
  });

  it('fails and lists value exports missing from the mock', () => {
    assert.ok(
      missing.stdout.includes(
        'Exports of src/index.ts missing in src/mock.ts (1):'
      )
    );
    assert.ok(missing.stdout.includes('- bar'));
    assert.equal(missing.status, 1);
  });

  it('fails with a usage message when arguments are not provided', () => {
    assert.ok(noArguments.stderr.includes('Usage:'));
    assert.equal(noArguments.status, 1);
  });
});
