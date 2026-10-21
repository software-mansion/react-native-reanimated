import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { describe, it } from 'node:test';

const SCRIPT_PATH = path.resolve(
  import.meta.dirname,
  '..',
  'resolve-release-version.js'
);
const FIXTURES_DIR = path.join(
  import.meta.dirname,
  '__fixtures__',
  'releasing'
);

function resolveVersion(fixture: string, args: string[]) {
  const result = spawnSync(
    process.execPath,
    [
      SCRIPT_PATH,
      '--package-json-path',
      path.join(FIXTURES_DIR, fixture, 'package.json'),
      ...args,
    ],
    { encoding: 'utf8' }
  );
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

describe('resolve-release-version', () => {
  it('keeps the base version of an unreleased version for nightlies', () => {
    assert.match(
      resolveVersion('unreleased', ['--nightly']),
      /^4\.8\.0-nightly-\d{8}-[0-9a-f]{9}$/
    );
  });

  it('bumps the patch of a released version for nightlies', () => {
    assert.match(
      resolveVersion('released', ['--nightly']),
      /^4\.7\.2-nightly-\d{8}-[0-9a-f]{9}$/
    );
  });

  it('keeps a released version for stable releases', () => {
    assert.equal(resolveVersion('released', []), '4.7.1');
  });
});
