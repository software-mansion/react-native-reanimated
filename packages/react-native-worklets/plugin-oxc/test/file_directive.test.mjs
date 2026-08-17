import test from 'node:test';
import assert from 'node:assert/strict';
import plugin from '../index.js';
const { transform } = plugin;

// Bundle-only mode: every workletized top-level function becomes a
// `const <name> = require(".worklets/<hash>.js").default(...)` in the main
// code, and the inner factory definition lives in `files[<n>].content`.

const REQUIRE_FACTORY = /require\("react-native-worklets\/\.worklets\/\d+\.js"\)\.default/;

test('file-level worklet directive workletizes every top-level function', () => {
  const input = `
    'worklet';
    function foo(x) { return x + 1; }
    const bar = (y) => y * 2;
  `;
  const { code, files } = transform(input, 'test.js', {});
  assert.equal(files.length, 2, `expected 2 worklets. Got files=${files.length}`);
  assert.doesNotMatch(code, /^'worklet'/m, "file directive should be stripped");
});

test('file-level directive turns object methods into worklets', () => {
  const input = `
    'worklet';
    const obj = { foo(x) { return x; } };
  `;
  const { code, files } = transform(input, 'test.js', {});
  assert.match(code, REQUIRE_FACTORY);
  assert.equal(files.length, 1);
});

test('file-level directive: CJS exports get dehoisted to end', () => {
  const input = `
    'worklet';
    exports.foo = foo;
    function foo(x) { return x; }
  `;
  const { code } = transform(input, 'test.js', {});
  // The require-factory binding of `foo` must precede `exports.foo = foo`
  // — mirrors the TS plugin's CJS-exports dehoist.
  const fooIdx = code.search(/const foo = require\(/);
  const exportIdx = code.indexOf('exports.foo');
  assert.ok(
    fooIdx >= 0 && exportIdx >= 0 && fooIdx < exportIdx,
    `factory binding should precede exports.foo. Got:\n${code}`
  );
});

test('file-level directive: export default function is workletized', () => {
  const input = `
    'worklet';
    export default function foo(x) { return x + 1; }
  `;
  const { code, files } = transform(input, 'test.js', {});
  assert.match(code, REQUIRE_FACTORY);
  assert.equal(files.length, 1);
});

test('file-level directive: module.exports is NOT dehoisted (matches TS)', () => {
  const input = `
    'worklet';
    module.exports = foo;
    function foo(x) { return x; }
  `;
  const { code } = transform(input, 'test.js', {});
  // module.exports stays put — the TS plugin only dehoists `exports.*`.
  const fooIdx = code.search(/const foo = require\(/);
  const exportIdx = code.indexOf('module.exports');
  assert.ok(
    exportIdx >= 0 && fooIdx > exportIdx,
    `module.exports should appear before the require-factory binding. Got:\n${code}`
  );
});
