import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

const ROOT_DIR = path.resolve(import.meta.dirname, '..', '..');
const OXLINT_PATH = path.join(ROOT_DIR, 'node_modules', '.bin', 'oxlint');
const PLUGIN_PATH = path.join(
  ROOT_DIR,
  'scripts',
  'oxlint',
  'eslint-core-rules.cjs'
);

function lintStrict(mode: 'global' | 'never', code: string) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eslint-core-rules-'));
  try {
    fs.writeFileSync(
      path.join(dir, 'oxlintrc.json'),
      JSON.stringify({
        categories: { correctness: 'off' },
        plugins: [],
        jsPlugins: [{ name: 'eslint-core', specifier: PLUGIN_PATH }],
        rules: { 'eslint-core/strict': ['error', mode] },
      })
    );
    fs.writeFileSync(path.join(dir, 'file.ts'), code);
    return spawnSync(
      OXLINT_PATH,
      ['-c', 'oxlintrc.json', '-f', 'json', 'file.ts'],
      { cwd: dir, encoding: 'utf8' }
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function countStrictErrors(result: ReturnType<typeof lintStrict>) {
  const { diagnostics } = JSON.parse(result.stdout) as {
    diagnostics: { code: string }[];
  };
  return diagnostics.filter(
    (diagnostic) => diagnostic.code === 'eslint-core(strict)'
  ).length;
}

const WITH_DIRECTIVE = "'use strict';\nexport const a = 1;\n";
const WITHOUT_DIRECTIVE = 'export const a = 1;\n';

describe('eslint-core/strict', () => {
  it('requires the directive in global mode', () => {
    const result = lintStrict('global', WITHOUT_DIRECTIVE);
    assert.equal(result.status, 1);
    assert.equal(countStrictErrors(result), 1);
  });

  it('accepts the directive in global mode', () => {
    const result = lintStrict('global', WITH_DIRECTIVE);
    assert.equal(result.status, 0);
    assert.equal(countStrictErrors(result), 0);
  });

  it('forbids the directive in never mode', () => {
    const result = lintStrict('never', WITH_DIRECTIVE);
    assert.equal(result.status, 1);
    assert.equal(countStrictErrors(result), 1);
  });

  it('accepts files without the directive in never mode', () => {
    const result = lintStrict('never', WITHOUT_DIRECTIVE);
    assert.equal(result.status, 0);
    assert.equal(countStrictErrors(result), 0);
  });
});
