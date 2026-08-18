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

function runValidateMock(args: string[]) {
  return spawnSync(
    process.execPath,
    ['--experimental-strip-types', SCRIPT_PATH, ...args],
    { cwd: FIXTURES_DIR, encoding: 'utf8' }
  );
}

function validateMock(mockFile: string) {
  return runValidateMock([
    '--source',
    'index.ts',
    '--mock',
    mockFile,
    '--tsConfig',
    'tsconfig.json',
  ]);
}

describe('validate-mock', () => {
  const baseline = validateMock('mock.ts');
  const missing = validateMock('missing-mock.ts');
  const extra = validateMock('extra-mock.ts');
  const noArguments = runValidateMock([]);

  it('passes when the mock covers all value exports', () => {
    assert.ok(
      baseline.stdout.includes(
        'All value exports of index.ts are present in mock.ts.'
      )
    );
    assert.ok(!baseline.stdout.includes('Present in'));
    assert.equal(baseline.status, 0);
  });

  it('skips type exports and type-only exports', () => {
    assert.ok(!baseline.stdout.includes('Baz'));
    assert.ok(!baseline.stdout.includes('Kind'));
  });

  it('fails and lists value exports missing from the mock', () => {
    assert.ok(
      missing.stdout.includes(
        'Exports of index.ts missing in missing-mock.ts (1):'
      )
    );
    assert.ok(missing.stdout.includes('- bar'));
    assert.equal(missing.status, 1);
  });

  it('fails and lists mock properties that are not exported', () => {
    assert.ok(
      extra.stdout.includes(
        'Present in extra-mock.ts but not exported from index.ts (1):'
      )
    );
    assert.ok(extra.stdout.includes('- extra'));
    assert.equal(extra.status, 1);
  });

  it('fails with a usage message when arguments are not provided', () => {
    assert.ok(noArguments.stderr.includes('Usage:'));
    assert.equal(noArguments.status, 1);
  });
});
