import test from 'node:test';
import assert from 'node:assert/strict';
import plugin from '../index.js';
const { transform } = plugin;

// Bundle-only mode: the inner factory definition (with `__workletHash`,
// `__closure`, etc.) lives in `result.files[0].content`. The main `code`
// only contains `require("react-native-worklets/.worklets/<hash>.js").default(...)`.

test('FunctionDeclaration with worklet directive is workletized', () => {
  const input = `
    function foo(x) {
      'worklet';
      return x + 2;
    }
  `;
  const { code, files } = transform(input, 'test.js', {});
  assert.match(code, /require\("react-native-worklets\/\.worklets\/\d+\.js"\)\.default/);
  assert.equal(files.length, 1);
  assert.match(files[0].content, /__workletHash/);
  assert.match(files[0].content, /__closure/);
});

test('ArrowFunctionExpression with worklet directive is workletized', () => {
  const input = `
    const foo = (x) => {
      'worklet';
      return x + 2;
    };
  `;
  const { code, files } = transform(input, 'test.js', {});
  assert.match(code, /require\(.*\)\.default/);
  assert.match(files[0].content, /__workletHash/);
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
  const { code, files } = transform(input, 'test.js', {});
  assert.match(code, /\.default\(\{\s*a,\s*b\s*\}\)/);
  assert.match(files[0].content, /__closure/);
});

test('useAnimatedStyle callback is auto-workletized', () => {
  const input = `
    import { useAnimatedStyle } from 'react-native-reanimated';
    function Box() {
      const style = useAnimatedStyle(() => ({ width: 100 }));
    }
  `;
  const { code, files } = transform(input, 'test.js', {});
  assert.match(code, /useAnimatedStyle\(require\(.*\)\.default/);
  assert.match(files[0].content, /__workletHash/);
});

test('non-worklet code passes through unchanged', () => {
  const input = `
    function foo() {
      var x = 1;
    }
  `;
  const { code, files } = transform(input, 'test.js', {});
  assert.doesNotMatch(code, /__workletHash/);
  assert.equal(files.length, 0);
  assert.match(code, /function foo/);
});
