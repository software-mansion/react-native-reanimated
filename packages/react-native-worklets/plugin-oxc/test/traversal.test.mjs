import test from 'node:test';
import assert from 'node:assert/strict';
import plugin from '../index.js';
const { transform } = plugin;

const REQUIRE_FACTORY = /require\("react-native-worklets\/\.worklets\/\d+\.js"\)\.default/;

const CASES = [
  ['worklet directive in JSX attribute', `const C = () => <Btn onPress={() => { 'worklet'; return 1; }} />;`],
  ['hook call in JSX attribute', `const C = () => <V style={useAnimatedStyle(() => ({ width: 1 }))} />;`],
  ['gesture chain in JSX attribute', `const C = () => <GD gesture={Gesture.Tap().onEnd((e) => { return e; })} />;`],
  ['layout animation callback in JSX attribute', `const C = () => <V exiting={FadeOut.withCallback((f) => { 'worklet'; return f; })} />;`],
  ['object hook in JSX attribute', `const C = () => <V handler={useAnimatedScrollHandler({ onScroll(e) { return e; } })} />;`],
  ['worklet in JSX children', `const C = () => <V>{() => { 'worklet'; return 1; }}</V>;`],
  ['worklet in nested JSX children', `const C = () => <A><B><D onPress={() => { 'worklet'; return 1; }} /></B></A>;`],
  ['worklet in JSX fragment children', `const C = () => <><V onPress={() => { 'worklet'; return 1; }} /></>;`],
  ['worklet in JSX spread attribute', `const C = () => <V {...{ onPress: () => { 'worklet'; return 1; } }} />;`],
  ['worklet in JSX spread child', `const C = () => <V>{...[() => { 'worklet'; return 1; }]}</V>;`],
  ['worklet in JSX element-valued attribute', `const C = () => <V header=<B onPress={() => { 'worklet'; return 1; }} /> />;`],
  ['worklet under optional chain', `const x = !!(() => { 'worklet'; })?.__initData?.bytecode;`],
  ['worklet in template literal', 'const s = `${function () { \'worklet\'; return 1; }}`;'],
  ['worklet in class expression field', `const K = class { p = function () { 'worklet'; return 1; }; };`],
  ['worklet in for-statement init', `for (let f = () => { 'worklet'; return 1; };;) { break; }`],
  ['worklet as default parameter value', `function outer(cb = function () { 'worklet'; return 1; }) { return cb; }`],
  ['sequence-expression callee', `(0, useAnimatedStyle)(() => ({ width: 1 }));`],
  ['sequence-expression member callee', `(0, _reanimated.useAnimatedStyle)(() => ({ width: 1 }));`],
  ['sequence-expression gesture callee', `(0, Gesture.Tap().onUpdate)((e) => { return e; });`],
];

for (const [name, source] of CASES) {
  test(`workletizes: ${name}`, () => {
    const { code, files } = transform(source, 'test.tsx', {});
    assert.equal(files.length, 1, 'expected exactly one emitted worklet file');
    assert.match(code, REQUIRE_FACTORY);
  });
}

test('workletizes both worklets in one JSX tree', () => {
  const source = `const C = () => <A onPress={() => { 'worklet'; return 1; }}><B onPress={() => { 'worklet'; return 2; }} /></A>;`;
  const { files } = transform(source, 'test.tsx', {});
  assert.equal(files.length, 2);
});

test('captures closure from a worklet inside a JSX attribute', () => {
  const source = `const C = () => { const a = 1; return <V onPress={() => { 'worklet'; return a; }} />; };`;
  const { files } = transform(source, 'test.tsx', {});
  assert.equal(files.length, 1);
  assert.match(files[0].content, /__closure = \{\s*a\s*\}/);
});

test('referenced worklet survives a sequence-expression callee', () => {
  const source = `const cb = () => { return 1; }; (0, useAnimatedStyle)(cb);`;
  const { code, files } = transform(source, 'test.tsx', {});
  assert.equal(files.length, 1);
  assert.match(code, REQUIRE_FACTORY);
});
