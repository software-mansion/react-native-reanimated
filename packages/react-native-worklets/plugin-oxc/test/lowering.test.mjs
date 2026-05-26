import test from 'node:test';
import assert from 'node:assert/strict';
import plugin from '../index.js';
const { transform } = plugin;

function workletBody(code) {
  const m = code.match(/code:\s*"((?:[^"\\]|\\.)*)"/);
  if (!m) return null;
  return JSON.parse('"' + m[1] + '"');
}

test('arrow function inside worklet body is lowered to function expression', () => {
  const input = `
    function foo() {
      'worklet';
      const inc = (x) => x + 1;
      return inc(5);
    }
  `;
  const { code } = transform(input, 'test.js', { disableSourceMaps: true });
  const body = workletBody(code);
  assert.ok(body, `expected init data code; got:\n${code}`);
  // Arrow should not survive in lowered output
  assert.doesNotMatch(body, /=>/, `arrow leaked into worklet body:\n${body}`);
  assert.match(body, /function/, `expected function keyword:\n${body}`);
});

test('optional chaining inside worklet body is lowered', () => {
  const input = `
    function foo(x) {
      'worklet';
      return x?.y;
    }
  `;
  const { code } = transform(input, 'test.js', { disableSourceMaps: true });
  const body = workletBody(code);
  assert.doesNotMatch(body, /\?\./, `optional chaining leaked into body:\n${body}`);
});

test('nullish coalescing inside worklet body is lowered', () => {
  const input = `
    function foo(x) {
      'worklet';
      return x ?? 0;
    }
  `;
  const { code } = transform(input, 'test.js', { disableSourceMaps: true });
  const body = workletBody(code);
  assert.doesNotMatch(body, /\?\?/, `nullish coalescing leaked into body:\n${body}`);
});

test('class fields inside worklet body are lowered', () => {
  const input = `
    function foo() {
      'worklet';
      class Cls {
        x = 1;
        m() { return this.x; }
      }
      return new Cls().m();
    }
  `;
  const { code } = transform(input, 'test.js', { disableSourceMaps: true });
  const body = workletBody(code);
  // After lowering, `x = 1` should be moved to constructor — not as a class field
  assert.doesNotMatch(body, /class\s+Cls\s*\{[^}]*x\s*=/m, `class field leaked:\n${body}`);
});
