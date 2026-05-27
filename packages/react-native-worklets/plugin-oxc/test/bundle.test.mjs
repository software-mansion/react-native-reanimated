import test from 'node:test';
import assert from 'node:assert/strict';
import plugin from '../index.js';
const { transform } = plugin;

test('bundle mode: factory call becomes require(path).default(...)', () => {
  const input = `function foo(x) { 'worklet'; return x + 1; }`;
  const { code, files } = transform(input, 'test.js', { bundleMode: true });
  assert.match(code, /require\("react-native-worklets\/\.worklets\/\d+\.js"\)\.default/);
  assert.equal(files.length, 1, `expected 1 emitted file, got ${files.length}`);
  assert.match(files[0].path, /\.worklets\/\d+\.js$/);
  assert.match(files[0].content, /export default/);
  assert.match(files[0].content, /__workletHash/);
});

test('bundle mode: emitted file has no __initData / __stackDetails', () => {
  const input = `function foo(x) { 'worklet'; return x + 1; }`;
  const { files } = transform(input, 'test.js', { bundleMode: true });
  assert.doesNotMatch(files[0].content, /__initData/);
  assert.doesNotMatch(files[0].content, /__stackDetails/);
});

test('bundle mode: closure vars are forwarded both to require call and factory', () => {
  const input = `
    const a = 1; const b = 2;
    function foo() { 'worklet'; return a + b; }
  `;
  const { code, files } = transform(input, 'test.js', { bundleMode: true });
  assert.match(code, /\.default\(\{\s*a,\s*b\s*\}\)/, `Got source:\n${code}`);
  assert.match(files[0].content, /Factory\(\{\s*a,\s*b\s*\}\)/, `Got file:\n${files[0].content}`);
});
