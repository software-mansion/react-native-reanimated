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
    module.exports = foo;
    function foo(x) { return x; }
  `;
  // Disable source maps so the sourcesContent embed doesn't appear in the
  // output (it would contain the literal "module.exports = foo;" substring
  // and confuse our positional check).
  const { code } = transform(input, 'test.js', { disableSourceMaps: true });
  assert.match(code, /__workletHash/);
  const fooIdx = code.indexOf('function foo_testJs1Factory');
  const exportIdx = code.indexOf('module.exports');
  assert.ok(
    fooIdx >= 0 && exportIdx >= 0 && fooIdx < exportIdx,
    `factory should be defined before module.exports. Got:\n${code}`
  );
});
