import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

const validator = path.resolve(
  'scripts/validate-compatibility-peer-dependencies.js'
);

function validate(peerRange: string, developmentVersion: string) {
  const directory = mkdtempSync(path.join(tmpdir(), 'rn-peer-range-'));
  try {
    writeFileSync(
      path.join(directory, 'package.json'),
      JSON.stringify({
        version: '1.0.0-main',
        peerDependencies: { 'react-native': peerRange },
        devDependencies: { 'react-native': developmentVersion },
      })
    );
    writeFileSync(
      path.join(directory, 'compatibility.json'),
      JSON.stringify({
        nightly: { 'react-native': ['0.87', '0.88', '0.89'] },
      })
    );
    return spawnSync(process.execPath, [validator], {
      cwd: directory,
      encoding: 'utf8',
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test('accepts stable peers when development uses stable RN', () => {
  assert.equal(validate('0.87 - 0.89', '0.89.0').status, 0);
});

test('requires the supported development RC alongside stable peers', () => {
  assert.equal(validate('0.87 - 0.89 || 0.89.0-rc.1', '0.89.0-rc.1').status, 0);
  assert.equal(validate('0.87 - 0.89', '0.89.0-rc.1').status, 1);
});

test('rejects a different RC or missing stable support', () => {
  assert.equal(validate('0.87 - 0.89 || 0.89.0-rc.2', '0.89.0-rc.1').status, 1);
  assert.equal(validate('0.89.0-rc.1', '0.89.0-rc.1').status, 1);
});

test('does not extend compatibility to an unsupported development minor', () => {
  assert.equal(validate('0.87 - 0.89 || 0.90.0-rc.1', '0.90.0-rc.1').status, 1);
});
