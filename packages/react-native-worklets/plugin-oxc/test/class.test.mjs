import test from 'node:test';
import assert from 'node:assert/strict';
import plugin from '../index.js';
const { transform } = plugin;

test('class with __workletClass marker is left alone', () => {
  const input = `
    class Foo {
      __workletClass = true;
      bar() { return 42; }
    }
  `;
  const { code } = transform(input, 'test.js', {});
  assert.match(code, /class Foo/, `Got:\n${code}`);
  assert.match(code, /__workletClass/, 'marker should be preserved');
  assert.doesNotMatch(code, /__classFactory/, 'no factory wrap in bundle-only mode');
});

test('class without marker is left alone', () => {
  const input = `
    class Foo {
      bar() { return 42; }
    }
  `;
  const { code } = transform(input, 'test.js', {});
  assert.doesNotMatch(code, /__classFactory/);
  assert.match(code, /class Foo/);
});

for (const [label, member, message] of [
  ['instance method', 'bar() { \'worklet\'; return 1; }', /`bar` class method cannot be a worklet/],
  ['static method', 'static bar() { \'worklet\'; return 1; }', /`bar` class method cannot be a worklet/],
  ['computed method', '[key]() { \'worklet\'; return 1; }', /`<computed>` class method cannot be a worklet/],
  ['getter', 'get bar() { \'worklet\'; return 1; }', /`bar` class getter cannot be a worklet/],
  ['setter', 'set bar(v) { \'worklet\'; this.v = v; }', /`bar` class setter cannot be a worklet/],
  ['constructor', 'constructor(x) { \'worklet\'; this.x = x; }', /class constructor cannot be a worklet/],
]) {
  test(`class ${label} with worklet directive is rejected`, () => {
    assert.throws(() => transform(`class Foo { ${member} }`, 'test.js', {}), message);
  });
}

test('worklet nested in a plain class method is still workletized', () => {
  const input = `
    class Foo {
      bar() {
        return useAnimatedStyle(() => ({ width: 1 }));
      }
    }
  `;
  const { code, files } = transform(input, 'test.js', {});
  assert.equal(files.length, 1);
  assert.match(code, /require\("react-native-worklets\/\.worklets\/\d+\.js"\)/);
});

test('worklet class field arrow is still workletized', () => {
  const input = `
    class Foo {
      bar = () => {
        'worklet';
        return 1;
      };
    }
  `;
  const { code, files } = transform(input, 'test.js', {});
  assert.equal(files.length, 1);
  assert.match(code, /bar = require\("react-native-worklets\/\.worklets\/\d+\.js"\)/);
});

test('class method without worklet directive is left as a method', () => {
  const input = `
    class Foo {
      bar() {
        return 1;
      }
    }
  `;
  const { code } = transform(input, 'test.js', {});
  assert.match(code, /bar\(\)/);
});
