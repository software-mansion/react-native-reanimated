import test from 'node:test';
import assert from 'node:assert/strict';
import plugin from '../index.js';
const { transform } = plugin;

test('file-level worklet directive workletizes every top-level function', () => {
  const input = `
    'worklet';
    function foo(x) { return x + 1; }
    const bar = (y) => y * 2;
  `;
  const { code } = transform(input, 'test.js', {});
  const matches = code.match(/__workletHash/g) || [];
  assert.equal(matches.length, 2, `expected 2 worklets. Got:\n${code}`);
  assert.doesNotMatch(code, /^'worklet'/m, "file directive should be stripped");
});

test('file-level directive turns object methods into worklets', () => {
  const input = `
    'worklet';
    const obj = { foo(x) { return x; } };
  `;
  const { code } = transform(input, 'test.js', {});
  assert.match(code, /__workletHash/, `Got:\n${code}`);
});

test('file-level directive: CJS exports get dehoisted to end', () => {
  const input = `
    'worklet';
    exports.foo = foo;
    function foo(x) { return x; }
  `;
  // Disable source maps so the sourcesContent embed doesn't appear in the
  // output (it would contain the literal "exports.foo" substring and confuse
  // our positional check).
  const { code } = transform(input, 'test.js', { disableSourceMaps: true });
  assert.match(code, /__workletHash/);
  const fooIdx = code.indexOf('function foo_testJs1Factory');
  const exportIdx = code.indexOf('exports.foo');
  assert.ok(
    fooIdx >= 0 && exportIdx >= 0 && fooIdx < exportIdx,
    `factory should be defined before exports.foo. Got:\n${code}`
  );
});

test('file-level directive: export default function is workletized', () => {
  const input = `
    'worklet';
    export default function foo(x) { return x + 1; }
  `;
  const { code } = transform(input, 'test.js', { disableSourceMaps: true });
  assert.match(code, /__workletHash/, `Got:\n${code}`);
});

test('file-level directive: implicit this-using object becomes context object', () => {
  const input = `
    'worklet';
    const ctx = { counter: 0, bump() { this.counter += 1; } };
  `;
  const { code } = transform(input, 'test.js', { disableSourceMaps: true });
  assert.match(
    code,
    /__workletContextObjectFactory/,
    `expected context-object factory. Got:\n${code}`
  );
});

test('file-level directive: module.exports is NOT dehoisted (matches TS)', () => {
  const input = `
    'worklet';
    module.exports = foo;
    function foo(x) { return x; }
  `;
  const { code } = transform(input, 'test.js', { disableSourceMaps: true });
  // module.exports stays put — the TS plugin only dehoists `exports.*`.
  const fooIdx = code.indexOf('function foo_testJs1Factory');
  const exportIdx = code.indexOf('module.exports');
  assert.ok(
    exportIdx >= 0 && fooIdx > exportIdx,
    `module.exports should appear before the factory. Got:\n${code}`
  );
});
