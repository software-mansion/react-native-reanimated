import test from 'node:test';
import assert from 'node:assert/strict';
import plugin from '../index.js';
const { transform } = plugin;

test('explicit __workletContextObject gets a factory', () => {
  const input = `
    const ctx = {
      __workletContextObject: true,
      value: 1,
    };
  `;
  const { code, files } = transform(input, 'test.js', {});
  assert.doesNotMatch(code, /__workletContextObject:/);
  assert.match(
    code,
    /__workletContextObjectFactory: require\("react-native-worklets\/\.worklets\/\d+\.js"\)\.default\(\{\}\)/
  );
  assert.equal(files.length, 1);
  assert.match(files[0].content, /return \{\s*value: 1\s*\}/);
});

test('implicit context object in a worklet file gets a factory', () => {
  const input = `
    'worklet';
    export const ctx = {
      value: 1,
      getValue() { return this.value; },
    };
  `;
  const { code, files } = transform(input, 'test.js', {});
  assert.match(code, /getValue\(\) \{/, 'method must not be workletized');
  assert.match(code, /__workletContextObjectFactory:/);
  assert.equal(files.length, 1);
  assert.match(files[0].content, /return this\.value/);
});

test('context object factory captures outer bindings', () => {
  const input = `
    const outer = 1;
    const ctx = {
      __workletContextObject: true,
      value: outer,
    };
  `;
  const { code, files } = transform(input, 'test.js', {});
  assert.match(code, /\.default\(\{ outer \}\)/, `Got:\n${code}`);
  assert.match(files[0].content, /__closure = \{ outer \}/);
});

test('plain object in a worklet file still workletizes its methods', () => {
  const input = `
    'worklet';
    export const o = {
      m() { return 1; },
    };
  `;
  const { code, files } = transform(input, 'test.js', {});
  assert.doesNotMatch(code, /__workletContextObject/);
  assert.equal(files.length, 1);
  assert.match(code, /m: require\("react-native-worklets\/\.worklets\/\d+\.js"\)/);
});

test('worklet getter is rejected instead of silently losing its accessor', () => {
  const input = `const o = { get x() { 'worklet'; return 1; } };`;
  assert.throws(
    () => transform(input, 'test.js', {}),
    /the `x` getter cannot be a worklet/
  );
});

test('worklet setter is rejected instead of silently losing its accessor', () => {
  const input = `const o = { set x(v) { 'worklet'; this._v = v; } };`;
  assert.throws(
    () => transform(input, 'test.js', {}),
    /the `x` setter cannot be a worklet/
  );
});

test('accessor without a worklet directive passes through', () => {
  const input = `const o = { get x() { return 1; }, set x(v) { this._v = v; } };`;
  const { code } = transform(input, 'test.js', {});
  assert.match(code, /get x\(\)/);
  assert.match(code, /set x\(v\)/);
});
