import test from 'node:test';
import assert from 'node:assert/strict';
import plugin from '../index.js';
const { transform } = plugin;

test('class with __workletClass marker becomes a factory pair', () => {
  const input = `
    class Foo {
      __workletClass = true;
      bar() { return 42; }
    }
  `;
  const { code } = transform(input, 'test.js', {});
  assert.match(code, /function Foo__classFactory/, `Got:\n${code}`);
  assert.match(code, /const Foo = Foo__classFactory\(\)/, `Got:\n${code}`);
  assert.doesNotMatch(code, /__workletClass\s*=\s*true/, "marker should be stripped");
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

test('class processing is skipped when disableWorkletClasses is true', () => {
  const input = `
    class Foo {
      __workletClass = true;
      bar() { return 42; }
    }
  `;
  const { code } = transform(input, 'test.js', { disableWorkletClasses: true });
  assert.doesNotMatch(code, /__classFactory/);
});

test('file-level directive injects class marker', () => {
  const input = `
    'worklet';
    class Foo {
      bar() { return 42; }
    }
  `;
  const { code } = transform(input, 'test.js', {});
  assert.match(code, /function Foo__classFactory/, `Got:\n${code}`);
});
