import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
const require_ = createRequire(import.meta.url);

let babelCore!: typeof import('@babel/core');
try {
  babelCore = require_('@babel/core');
} catch {
  // NOOP
}

test(
  'babel shim runs the Oxc transform when used as a babel plugin',
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
          plugins: [shim],
        }
      );
      assert.ok(result && result.code);
      assert.match(
        result.code,
        /const foo = function foo_\w+Factory\(\) \{/,
        `got:\n${result?.code}`
      );
      assert.doesNotMatch(result.code, /require\(/);

      const metroResult = babelCore.transformSync(
        `function foo(x) { 'worklet'; return x + 1; }`,
        {
          filename: 'test.js',
          babelrc: false,
          configFile: false,
          caller: { name: 'metro', bundler: 'metro' },
          plugins: [shim],
        }
      );
      assert.ok(metroResult && metroResult.code);
      assert.match(
        metroResult.code,
        /require\(["']react-native-worklets\/\.worklets\/\d+\.js["']\)\.default/,
        `got:\n${metroResult?.code}`
      );
    } finally {
      fs.writeFileSync = originalWrite;
      fs.mkdirSync = originalMkdir;
      delete require_.cache[require_.resolve('../babel.js')];
    }
  }
);
