import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require_ = createRequire(import.meta.url);

let babelCore;
try {
  babelCore = require_('@babel/core');
} catch {
  // Babel not available in this workspace from this path — skip.
}

test(
  'babel shim runs the OXC transform when used as a babel plugin',
  { skip: !babelCore },
  () => {
    // Stub fs.writeFileSync so the test doesn't try to write to the real
    // react-native-worklets/.worklets/ directory during transform.
    const fs = require_('fs');
    const originalWrite = fs.writeFileSync;
    const originalMkdir = fs.mkdirSync;
    fs.writeFileSync = () => {};
    fs.mkdirSync = () => {};
    try {
      delete require_.cache[require_.resolve('../babel.js')];
      const shim = require_('../babel.js');
      const result = babelCore.transformSync(
        `function foo(x) { 'worklet'; return x + 1; }`,
        {
          filename: 'test.js',
          babelrc: false,
          configFile: false,
          plugins: [[shim, { bundleMode: true, disableSourceMaps: true }]],
        }
      );
      assert.ok(result && result.code);
      // Bundle-only output: the main code only contains the require-factory
      // call site; the worklet body lives in the emitted file.
      assert.match(
        result.code,
        /require\(["']react-native-worklets\/\.worklets\/\d+\.js["']\)\.default/,
        `got:\n${result?.code}`
      );
    } finally {
      fs.writeFileSync = originalWrite;
      fs.mkdirSync = originalMkdir;
      delete require_.cache[require_.resolve('../babel.js')];
    }
  }
);

test(
  'babel shim writes emitted bundle files to disk',
  { skip: !babelCore },
  () => {
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
      babelCore.transformSync(`function foo(x) { 'worklet'; return x + 1; }`, {
        filename: 'test.js',
        babelrc: false,
        configFile: false,
        plugins: [[shim, { bundleMode: true }]],
      });
    } finally {
      fs.writeFileSync = original;
      fs.mkdirSync = originalMkdir;
      delete require_.cache[require_.resolve('../babel.js')];
    }

    assert.equal(captured.length, 1, 'expected one emitted file');
    assert.match(
      captured[0].path,
      /\.worklets[\\/]\d+\.js$/,
      `bad path: ${captured[0].path}`
    );
    assert.match(
      captured[0].content,
      /__workletHash/,
      `bad content:\n${captured[0].content}`
    );
  }
);

test(
  'babel shim runs the OXC pipeline without an explicit bundleMode flag',
  { skip: !babelCore },
  () => {
    delete require_.cache[require_.resolve('../babel.js')];
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
    assert.match(result.code, /require\(["']react-native-worklets\/\.worklets/);
  }
);

test(
  'babel shim rejects an explicit bundleMode: false',
  { skip: !babelCore },
  () => {
    delete require_.cache[require_.resolve('../babel.js')];
    const shim = require_('../babel.js');
    assert.throws(
      () =>
        babelCore.transformSync(`function foo() { 'worklet'; return 1; }`, {
          filename: 'test.js',
          babelrc: false,
          configFile: false,
          plugins: [[shim, { bundleMode: false }]],
        }),
      /supports Bundle Mode only/
    );
  }
);

