import test from 'node:test';
import assert from 'node:assert/strict';
import plugin from '../index.js';
const { transform } = plugin;

// Bundle-only mode does NOT support worklet classes (mirrors the
// `state.opts.bundleMode /* temporary */` short-circuit in `class.ts:49`).
// The plugin still strips the `__workletClass` marker so the class
// declaration is emitted clean — but no factory wrap happens.

test('class with __workletClass marker has marker stripped, declaration intact', () => {
  const input = `
    class Foo {
      __workletClass = true;
      bar() { return 42; }
    }
  `;
  const { code } = transform(input, 'test.js', {});
  assert.match(code, /class Foo/, `Got:\n${code}`);
  assert.doesNotMatch(code, /__workletClass/, 'marker should be stripped');
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

test('file-level directive does not error on classes (marker stripped)', () => {
  // File-level `'worklet'` injects the marker on every top-level class.
  // In bundle-only mode we just strip it back off — class declaration
  // passes through unchanged otherwise.
  const input = `
    'worklet';
    class Foo {
      bar() { return 42; }
    }
  `;
  const { code } = transform(input, 'test.js', {});
  assert.match(code, /class Foo/);
  assert.doesNotMatch(code, /__workletClass/);
  assert.doesNotMatch(code, /__classFactory/);
});

for (const [label, member] of [
  ['instance method', 'bar() { \'worklet\'; return 1; }'],
  ['static method', 'static bar() { \'worklet\'; return 1; }'],
  ['getter', 'get bar() { \'worklet\'; return 1; }'],
  ['setter', 'set bar(v) { \'worklet\'; this.v = v; }'],
  ['constructor', 'constructor(x) { \'worklet\'; this.x = x; }'],
]) {
  test(`class ${label} with worklet directive is left untouched`, () => {
    const { code, files } = transform(`class Foo { ${member} }`, 'test.js', {});
    assert.equal(files.length, 0);
    assert.doesNotMatch(code, /\.worklets\//);
    assert.match(code, /class Foo/);
  });
}

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
