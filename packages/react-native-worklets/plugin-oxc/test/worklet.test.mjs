import test from 'node:test';
import assert from 'node:assert/strict';
import plugin from '../index.js';
const { transform } = plugin;

test('FunctionDeclaration with worklet directive is workletized', () => {
  const input = `
    function foo(x) {
      'worklet';
      return x + 2;
    }
  `;
  const { code } = transform(input, 'test.js', {});
  console.log('--- output ---');
  console.log(code);
  console.log('--- end ---');
  assert.match(code, /__workletHash/);
  assert.match(code, /__closure/);
});

test('ArrowFunctionExpression with worklet directive is workletized', () => {
  const input = `
    const foo = (x) => {
      'worklet';
      return x + 2;
    };
  `;
  const { code } = transform(input, 'test.js', {});
  console.log('--- arrow output ---');
  console.log(code);
  console.log('--- end ---');
  assert.match(code, /__workletHash/);
});

test('worklet captures closure variables', () => {
  const input = `
    const a = 1;
    const b = 2;
    function foo() {
      'worklet';
      return a + b;
    }
  `;
  const { code } = transform(input, 'test.js', {});
  console.log('--- closure output ---');
  console.log(code);
  console.log('--- end ---');
  assert.match(code, /__closure/);
});

test('useAnimatedStyle callback is auto-workletized', () => {
  const input = `
    import { useAnimatedStyle } from 'react-native-reanimated';
    function Box() {
      const style = useAnimatedStyle(() => ({ width: 100 }));
    }
  `;
  const { code } = transform(input, 'test.js', {});
  console.log('--- autoworklet output ---');
  console.log(code);
  console.log('--- end ---');
  assert.match(code, /__workletHash/);
});

test('non-worklet code passes through unchanged', () => {
  const input = `
    function foo() {
      var x = 1;
    }
  `;
  const { code } = transform(input, 'test.js', {});
  assert.doesNotMatch(code, /__workletHash/);
  assert.match(code, /function foo/);
});
