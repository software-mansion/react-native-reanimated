import { spawnSync } from 'node:child_process';
import path from 'node:path';

const SCRIPT_PATH = path.resolve(__dirname, '../../../scripts/validate-mock.mts');
const FIXTURES_DIR = path.join(__dirname, '__fixtures__', 'validateMock');

function runValidateMock(
  fixture: string,
  args: string[] = ['src/index.ts', 'src/mock.ts']
) {
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
    expect(covered.stdout).toContain(
      'All value exports of src/index.ts are present in src/mock.ts.'
    );
    expect(covered.stdout).not.toContain('Present in');
    expect(covered.status).toBe(0);
  });

  it('skips type exports and type-only exports', () => {
    expect(covered.stdout).not.toContain('Baz');
    expect(covered.stdout).not.toContain('Kind');
  });

  it('fails and lists mock properties that are not exported', () => {
    expect(stale.stdout).toContain(
      'Present in src/mock.ts but not exported from src/index.ts (1):'
    );
    expect(stale.stdout).toContain('- stale');
    expect(stale.status).toBe(1);
  });

  it('fails and lists value exports missing from the mock', () => {
    expect(missing.stdout).toContain(
      'Exports of src/index.ts missing in src/mock.ts (1):'
    );
    expect(missing.stdout).toContain('- bar');
    expect(missing.status).toBe(1);
  });

  it('fails with a usage message when file arguments are not provided', () => {
    expect(noArguments.stderr).toContain('Usage:');
    expect(noArguments.status).toBe(1);
  });
});
