import test from 'node:test';
import assert from 'node:assert/strict';
import plugin from '../index.js';
const { transform } = plugin;

const REQUIRE_FACTORY =
  /require\("react-native-worklets\/\.worklets\/\d+\.js"\)\.default/;

test('a class in a worklet file is not given a __workletClass marker', () => {
  const input = `'worklet';\nclass Foo { bar() { return 42; } }`;
  const { code } = transform(input, 'test.js', {});
  assert.match(code, /class Foo/, `Got:\n${code}`);
  assert.doesNotMatch(code, /__workletClass/, `Got:\n${code}`);
});

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
});

for (const [label, member] of [
  ['instance method', "bar(x) { 'worklet'; return x + 2; }"],
  ['static method', "static bar(x) { 'worklet'; return x + 2; }"],
  ['computed method', "[key]() { 'worklet'; return 1; }"],
]) {
  test(`class ${label} with worklet directive becomes a workletized class field`, () => {
    const { code, files } = transform(
      `const key = 'm'; class Foo { ${member} }`,
      'test.js',
      {}
    );
    assert.equal(files.length, 1);
    assert.match(code, REQUIRE_FACTORY, `Got:\n${code}`);
    assert.doesNotMatch(code, /'worklet'/);
  });
}

test('a workletized method keeps its static and computed flags', () => {
  const { code } = transform(
    `const key = 'm'; class Foo { static [key]() { 'worklet'; return 1; } }`,
    'test.js',
    {}
  );
  assert.match(code, /static \[key\] = require\(/, `Got:\n${code}`);
});

for (const [label, member] of [
  ['getter', "get bar() { 'worklet'; return 1; }"],
  ['setter', "set bar(v) { 'worklet'; this.v = v; }"],
  ['constructor', "constructor(x) { 'worklet'; this.x = x; }"],
  ['private method', "#bar() { 'worklet'; return 1; }"],
]) {
  test(`class ${label} with worklet directive is left alone`, () => {
    const { code, files } = transform(`class Foo { ${member} }`, 'test.js', {});
    assert.equal(files.length, 0);
    assert.doesNotMatch(code, REQUIRE_FACTORY, `Got:\n${code}`);
    assert.match(code, /'worklet'|"worklet"/, `Got:\n${code}`);
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
  assert.match(
    code,
    /bar = require\("react-native-worklets\/\.worklets\/\d+\.js"\)/
  );
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
