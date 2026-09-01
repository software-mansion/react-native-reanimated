import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require_ = createRequire(import.meta.url);

let babelCore;
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
        plugins: [[shim, {}]],
      }
    );
    assert.ok(result && result.code);
    assert.match(result.code, /require\(["']react-native-worklets\/\.worklets/);
  }
);

test('babel shim parses JSX in a .js file', { skip: !babelCore }, () => {
  delete require_.cache[require_.resolve('../babel.js')];
  const shim = require_('../babel.js');
  const fs = require_('fs');
  const originalWrite = fs.writeFileSync;
  const originalMkdir = fs.mkdirSync;
  fs.writeFileSync = () => {};
  fs.mkdirSync = () => {};
  let result;
  try {
    result = babelCore.transformSync(
      `import { Comp } from 'react-native-worklets';\nfunction renderView() { 'worklet'; return <Comp />; }`,
      {
        filename: 'plain.js',
        babelrc: false,
        configFile: false,
        plugins: [
          [
            shim,
            { importForwarding: { moduleNames: ['react-native-worklets'] } },
          ],
          require_.resolve('@babel/plugin-syntax-jsx'),
        ],
      }
    );
  } finally {
    fs.writeFileSync = originalWrite;
    fs.mkdirSync = originalMkdir;
  }
  assert.ok(result && result.code);
  assert.match(result.code, /require\(["']react-native-worklets\/\.worklets/);
});

test(
  'babel shim leaves generated worklet files alone',
  { skip: !babelCore },
  () => {
    delete require_.cache[require_.resolve('../babel.js')];
    const shim = require_('../babel.js');
    const source = `export default (function f({}) {\n  const g = function () { return <Comp />; };\n  return g;\n});`;
    const result = babelCore.transformSync(source, {
      filename: '/repo/packages/react-native-worklets/.worklets/123.js',
      babelrc: false,
      configFile: false,
      plugins: [[shim, {}], require_.resolve('@babel/plugin-syntax-jsx')],
    });
    assert.ok(result && result.code);
    assert.match(result.code, /<Comp \/>/);
  }
);

test('babel shim leaves Flow files untouched', { skip: !babelCore }, () => {
  delete require_.cache[require_.resolve('../babel.js')];
  const shim = require_('../babel.js');
  const source =
    '/**\n * @flow strict-local\n */\n' +
    "function f(x: number) { 'worklet'; return x; }\n" +
    'const b = (y: number): number => y;';
  const result = babelCore.transformSync(source, {
    filename: 'flowish-worklet.js',
    babelrc: false,
    configFile: false,
    plugins: [[shim, {}], require_.resolve('@babel/plugin-syntax-flow')],
  });
  assert.ok(result && result.code);
  assert.doesNotMatch(result.code, /\.worklets\//);
});

test('babel shim throws on an unparseable file', { skip: !babelCore }, () => {
  delete require_.cache[require_.resolve('../babel.js')];
  const shim = require_('../babel.js');
  assert.throws(
    () =>
      babelCore.transformSync("export v from 'mod';", {
        filename: 'unsupported-syntax.js',
        babelrc: false,
        configFile: false,
        plugins: [
          [shim, {}],
          require_.resolve('@babel/plugin-syntax-export-default-from'),
        ],
      }),
    /could not be parsed/
  );
});
