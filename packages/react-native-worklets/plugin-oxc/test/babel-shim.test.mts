import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require_ = createRequire(import.meta.url);

let babelCore!: typeof import('@babel/core');
try {
  babelCore = require_('@babel/core');
} catch {
  // NOOP
}

test(
  'babel shim runs the OXC transform when used as a babel plugin',
  { skip: !babelCore },
  () => {
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
          plugins: [[shim, { bundleMode: true }]],
        }
      );
      assert.ok(result && result.code);
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
