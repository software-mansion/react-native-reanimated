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

test('worklet capturing a worklet class rewrites closure to __classFactory', () => {
  // `new Foo()` inside a worklet body where Foo is a captured worklet class
  // must:
  //   1. capture `Foo__classFactory` instead of `Foo`
  //   2. close over `Foo.Foo__classFactory` as the value
  //   3. prepend `const Foo = Foo__classFactory();` to the body string so
  //      `new Foo()` resolves on the UI thread.
  const input = `
    class Foo {
      __workletClass = true;
      bar() { return 42; }
    }
    function build() {
      'worklet';
      return new Foo();
    }
  `;
  const { code } = transform(input, 'test.js', { disableSourceMaps: true });
  // The closure object should reference Foo.Foo__classFactory.
  assert.match(
    code,
    /__closure\s*=\s*\{\s*Foo__classFactory:\s*Foo\.Foo__classFactory/,
    `expected __classFactory closure shape. Got:\n${code}`
  );
  // The factory call should pass `{ Foo }` (the class) — not the suffixed name.
  assert.match(
    code,
    /Factory\(\{[^}]*\bFoo\b[^}]*\}\)/,
    `expected stripped param pack. Got:\n${code}`
  );
  // The body string should include `const Foo = Foo__classFactory();`.
  const m = code.match(/code:\s*"((?:[^"\\]|\\.)*)"/);
  assert.ok(m, `expected init data code; got:\n${code}`);
  const body = JSON.parse('"' + m[1] + '"');
  assert.match(
    body,
    /const Foo\s*=\s*Foo__classFactory\(\)/,
    `expected prepended class init. Got body:\n${body}`
  );
});
