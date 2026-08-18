import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import plugin from '../index.js';
const { transform } = plugin;

test('relative require inside worklet body gets rebased when source lives in workletizable module', () => {
  const input = `
    function foo() {
      'worklet';
      const h = require('./helper');
      return h.go();
    }
  `;
  const packageDir = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), 'worklets-pkg-')),
    'node_modules',
    'react-native-worklets'
  );
  const { files } = transform(input, path.join(packageDir, 'src', 'foo.js'), {
    workletsPackageDir: packageDir,
  });
  assert.equal(files.length, 1);
  assert.match(
    files[0].content,
    /require\(["']\.\.\/src\/helper["']\)/,
    `Got file:\n${files[0].content}`
  );
});

test('relative require in non-workletizable file is left alone', () => {
  const input = `
    function foo() {
      'worklet';
      const h = require('./helper');
      return h.go();
    }
  `;
  const { files } = transform(input, '/proj/src/foo.js', {});
  assert.equal(files.length, 1);
  assert.match(
    files[0].content,
    /require\(["']\.\/helper["']\)/,
    `Got file:\n${files[0].content}`
  );
});
