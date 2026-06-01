import test from 'node:test';
import assert from 'node:assert/strict';
import plugin from '../index.js';
const { transform } = plugin;

// Coverage for the fixes applied alongside this file. Each block targets a
// concrete bug the smoke tests didn't catch — keep them surgical so a future
// regression diff points at the right block.

test('referenced worklet: const f = () => {...}; useAnimatedStyle(f) workletizes f', () => {
  const input = `
    import { useAnimatedStyle } from 'react-native-reanimated';
    const handler = () => ({ width: 100 });
    function Box() {
      const style = useAnimatedStyle(handler);
    }
  `;
  const { code } = transform(input, 'test.js', {});
  // The `handler` declaration itself must be transformed into a factory call.
  assert.match(code, /handler = .*\.__workletHash/s);
});

test('referenced worklet: function declaration handler', () => {
  const input = `
    import { useAnimatedStyle } from 'react-native-reanimated';
    function handler() { return { width: 100 }; }
    function Box() {
      const style = useAnimatedStyle(handler);
    }
  `;
  const { code } = transform(input, 'test.js', {});
  assert.match(code, /__workletHash/);
});

test('async worklet preserves async on inner factory function', () => {
  const input = `
    async function fetchSomething() {
      'worklet';
      return await Promise.resolve(1);
    }
  `;
  const { code } = transform(input, 'test.js', {});
  // Inner-fn declaration inside the factory should be \`async function\`.
  assert.match(code, /const fetchSomething = async function/);
});

test('generator worklet preserves generator on inner factory function', () => {
  const input = `
    function* iterator() {
      'worklet';
      yield 1;
    }
  `;
  const { code } = transform(input, 'test.js', {});
  assert.match(code, /const iterator = function\*/);
});

test('async worklet body string keeps async keyword', () => {
  const input = `
    async function fetchSomething() {
      'worklet';
      return await Promise.resolve(1);
    }
  `;
  const { code } = transform(input, 'test.js', {});
  // The __initData.code string must contain \`async function\` for the UI
  // runtime to evaluate it correctly. The string is inside double quotes —
  // a single \`async function\` token is the simplest signal.
  const initDataMatch = code.match(/code:\s*"([^"]+)"/);
  assert.ok(initDataMatch, '__initData.code string not found');
  assert.match(initDataMatch[1], /async function/);
});

test('no-worklet-closure directive is stripped from outer body', () => {
  const input = `
    function noClosure() {
      'worklet';
      'no-worklet-closure';
      return 1;
    }
  `;
  const { code } = transform(input, 'test.js', { disableSourceMaps: true });
  // Directive must not survive into the stringified worklet body. Source
  // maps embed the original source verbatim (which contains the directive),
  // so disable them when grepping the output for parity.
  assert.doesNotMatch(code, /no-worklet-closure/);
  // __closure must be empty literal.
  assert.match(code, /__closure\s*=\s*\{\s*\}/);
});

test('no-worklet-closure directive is stripped from nested inner function', () => {
  const input = `
    function outer() {
      'worklet';
      function inner() {
        'no-worklet-closure';
        return 1;
      }
      return inner();
    }
  `;
  const { code } = transform(input, 'test.js', { disableSourceMaps: true });
  assert.doesNotMatch(code, /no-worklet-closure/);
});

test('idempotent: running plugin twice equals running once', () => {
  const input = `
    function foo() { 'worklet'; return 1; }
  `;
  const first = transform(input, 'test.js', {}).code;
  const second = transform(first, 'test.js', {}).code;
  assert.equal(second, first);
});

test('init_data_id collision uniquified with _2 suffix', () => {
  // Two functions with identical bodies → identical hashes → would-collide
  // _worklet_<hash>_init_data names. Both must end up emitted; the
  // second one gets a `_2` suffix.
  const input = `
    function a() { 'worklet'; return 1; }
    function b() { 'worklet'; return 1; }
  `;
  const { code } = transform(input, 'test.js', {});
  const idMatches = code.match(/_worklet_\d+_init_data(?:_\d+)?/g) || [];
  const unique = new Set(idMatches);
  // At least two distinct init-data ids — collision avoided.
  assert.ok(
    unique.size >= 2,
    `expected at least 2 distinct init-data ids, got ${unique.size}: ${[...unique].join(',')}`
  );
});

test('shadowed self-reference does NOT trigger this._recur injection', () => {
  // Inner `let foo` shadows the function name — recursion-detection must
  // be scope-aware and NOT inject `const foo = this._recur;`.
  const input = `
    function foo() {
      'worklet';
      let foo = 1;
      return foo;
    }
  `;
  const { code } = transform(input, 'test.js', {});
  assert.doesNotMatch(code, /this\._recur/);
});

test('real self-reference DOES trigger this._recur injection', () => {
  const input = `
    function fact(n) {
      'worklet';
      return n <= 1 ? 1 : n * fact(n - 1);
    }
  `;
  const { code } = transform(input, 'test.js', {});
  assert.match(code, /this\._recur/);
});

test('JSX element name is not captured into closure', () => {
  const input = `
    import React from 'react';
    function Custom(props) { return null; }
    function W() {
      'worklet';
      return <Custom />;
    }
  `;
  const { code } = transform(input, 'test.tsx', {});
  // Custom is a JSX element name — should not show up in __closure.
  const closureMatch = code.match(/__closure\s*=\s*\{([^}]*)\}/);
  assert.ok(closureMatch, '__closure not found');
  assert.doesNotMatch(closureMatch[1], /Custom/);
});

test('globals (null, this) are not captured into closure', () => {
  const input = `
    function w() {
      'worklet';
      return null;
    }
  `;
  const { code } = transform(input, 'test.js', {});
  const closureMatch = code.match(/__closure\s*=\s*\{([^}]*)\}/);
  assert.ok(closureMatch);
  assert.doesNotMatch(closureMatch[1], /\bnull\b/);
});

test('shorthand-method getter using `this` triggers context-object detection', () => {
  const input = `
    'worklet';
    const ctx = {
      get value() { return this._v; },
    };
  `;
  const { code } = transform(input, 'test.js', {});
  // File-level worklet directive + implicit context-object detection should
  // mint a __workletContextObjectFactory.
  assert.match(code, /__workletContextObjectFactory/);
});

test('extraPlugins option does not throw and emits a stderr warning', () => {
  const input = `function foo() { 'worklet'; return 1; }`;
  // The warning is emitted to stderr once per process. Just ensure transform
  // doesn't reject the option.
  const { code } = transform(input, 'test.js', { extraPlugins: ['babel-plugin-foo'] });
  assert.match(code, /__workletHash/);
});

test('MOCK_VERSION env gate: without env, __pluginVersion comes from opts', () => {
  delete process.env.REANIMATED_JEST_SHOULD_MOCK_VERSION;
  const input = `function foo() { 'worklet'; return 1; }`;
  const { code } = transform(input, 'test.js', { pluginVersion: '1.2.3' });
  assert.match(code, /__pluginVersion\s*=\s*"1\.2\.3"/);
  assert.doesNotMatch(code, /__pluginVersion\s*=\s*"x\.y\.z"/);
});

test('MOCK_VERSION env gate: with env=1, mock wins', () => {
  process.env.REANIMATED_JEST_SHOULD_MOCK_VERSION = '1';
  try {
    const input = `function foo() { 'worklet'; return 1; }`;
    const { code } = transform(input, 'test.js', { pluginVersion: '1.2.3' });
    assert.match(code, /__pluginVersion\s*=\s*"x\.y\.z"/);
  } finally {
    delete process.env.REANIMATED_JEST_SHOULD_MOCK_VERSION;
  }
});

test('MOCK_VERSION env gate: no env, no pluginVersion → fall back to baked version', () => {
  // The plugin lives inside the worklets package and bakes its
  // `package.json` version at build time (mirrors `REAL_VERSION` in the TS
  // plugin). Raw napi callers without an injected `pluginVersion` still get
  // a real version string instead of a silently-missing `__pluginVersion`.
  delete process.env.REANIMATED_JEST_SHOULD_MOCK_VERSION;
  const input = `function foo() { 'worklet'; return 1; }`;
  const { code } = transform(input, 'test.js', {});
  assert.match(code, /__pluginVersion\s*=\s*"[^"]+"/);
});

test('gesture object hook (useTapGesture) workletizes object-arg methods', () => {
  const input = `
    import { useTapGesture } from 'react-native-gesture-handler';
    function C() {
      const g = useTapGesture({
        onUpdate(e) { return e.x; },
      });
    }
  `;
  const { code } = transform(input, 'test.js', {});
  assert.match(code, /__workletHash/);
});

test('gesture chain methods accept object literals (Gesture.Tap().onUpdate({...}))', () => {
  const input = `
    function C() {
      const g = Gesture.Tap().onUpdate({
        run(e) { return e.x; },
      });
    }
  `;
  const { code } = transform(input, 'test.js', {});
  assert.match(code, /__workletHash/);
});

test('referenced worklet survives through gesture chain', () => {
  const input = `
    const handler = (e) => e.x;
    function C() {
      const g = Gesture.Tap().onUpdate(handler);
    }
  `;
  const { code } = transform(input, 'test.js', {});
  assert.match(code, /handler = .*\.__workletHash/s);
});

test('referenced worklet: alias chain through identifier-only assignment', () => {
  // `findReferencedWorklet` in the TS plugin recurses through identifier
  // aliases. The rewrite mirrors this via fixed-point set expansion: when
  // `useAnimatedStyle(alias)` records `alias`'s symbol, the
  // `const alias = handler` declarator propagates membership to `handler`.
  const input = `
    import { useAnimatedStyle } from 'react-native-reanimated';
    const handler = () => ({ width: 100 });
    const alias = handler;
    function Box() {
      const style = useAnimatedStyle(alias);
    }
  `;
  const { code } = transform(input, 'test.js', {});
  assert.match(code, /handler = .*\.__workletHash/s);
});

test('referenced worklet: object-hook arg0 identifier-valued property', () => {
  // Mirrors `processWorkletizableObject` — `useAnimatedScrollHandler({ onScroll: fn })`
  // where `fn` is an identifier reference, not an inline function.
  const input = `
    import { useAnimatedScrollHandler } from 'react-native-reanimated';
    const onScroll = (e) => e.contentOffset.y;
    function C() {
      const h = useAnimatedScrollHandler({ onScroll });
    }
  `;
  const { code } = transform(input, 'test.js', {});
  assert.match(code, /onScroll = .*\.__workletHash/s);
});

test('referenced worklet: non-const binding via assignment expression', () => {
  // `let f; f = () => ...; useAnimatedStyle(f);` — TS handles this via
  // `findReferencedWorkletFromAssignmentExpression`. Rewrite walks the
  // assignment and injects the worklet directive on the RHS arrow.
  const input = `
    import { useAnimatedStyle } from 'react-native-reanimated';
    let handler;
    handler = (e) => ({ width: 100 });
    function Box() {
      const style = useAnimatedStyle(handler);
    }
  `;
  const { code } = transform(input, 'test.js', {});
  assert.match(code, /__workletHash/);
});

test('cjs file extension parses as plain JS (no TSX cast handling)', () => {
  // .cjs / .mjs used to fall back to TSX parser which accepts unusual syntax.
  // The cjs path must work as ordinary JS — round-trip a plain require.
  const input = `const x = require('y');`;
  const { code } = transform(input, 'test.cjs', {});
  assert.match(code, /require\("y"\)/);
});
