import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const require_ = createRequire(import.meta.url);

let babelCore;
try {
  babelCore = require_('@babel/core');
} catch (e) {
  // Babel not available in this workspace from this path — skip.
}

test('babel shim runs the OXC transform when used as a babel plugin', { skip: !babelCore }, () => {
  const shim = require_('../babel.js');
  const result = babelCore.transformSync(
    `function foo(x) { 'worklet'; return x + 1; }`,
    {
      filename: 'test.js',
      babelrc: false,
      configFile: false,
      plugins: [[shim, { disableSourceMaps: true }]],
    }
  );
  assert.ok(result && result.code);
  assert.match(result.code, /__workletHash/, `got:\n${result?.code}`);
});

test('babel shim writes bundle-mode files to disk', { skip: !babelCore }, () => {
  // Stub the directory resolution by intercepting writeFileSync. The shim
  // uses require('fs').writeFileSync internally; we monkey-patch it for the
  // duration of this test.
  const fs = require_('fs');
  const captured = [];
  const original = fs.writeFileSync;
  fs.writeFileSync = (filepath, content) => {
    captured.push({ path: String(filepath), content: String(content) });
  };
  // Also stub mkdirSync so it doesn't attempt real directory creation.
  const originalMkdir = fs.mkdirSync;
  fs.mkdirSync = () => {};

  try {
    // Cached resolution would prevent re-resolution; bypass by reloading.
    delete require_.cache[require_.resolve('../babel.js')];
    const shim = require_('../babel.js');
    babelCore.transformSync(
      `function foo(x) { 'worklet'; return x + 1; }`,
      {
        filename: 'test.js',
        babelrc: false,
        configFile: false,
        plugins: [[shim, { bundleMode: true }]],
      }
    );
  } finally {
    fs.writeFileSync = original;
    fs.mkdirSync = originalMkdir;
    delete require_.cache[require_.resolve('../babel.js')];
  }

  assert.equal(captured.length, 1, 'expected one emitted file');
  assert.match(captured[0].path, /\.worklets[\\/]\d+\.js$/, `bad path: ${captured[0].path}`);
  assert.match(captured[0].content, /__workletHash/, `bad content:\n${captured[0].content}`);
});
