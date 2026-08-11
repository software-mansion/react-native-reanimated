import test from 'node:test';
import assert from 'node:assert/strict';
import plugin from '../index.js';
const { transform } = plugin;

// Coverage for the fixes applied alongside this file. Each block targets a
// concrete bug the smoke tests didn't catch — keep them surgical so a future
// regression diff points at the right block.
//
// Bundle-only mode: the inner factory definition lives in
// `result.files[<n>].content`. The main `code` only contains
// `require("react-native-worklets/.worklets/<hash>.js").default(...)`
// calls. Assertions therefore target whichever output owns the signal.

const REQUIRE_FACTORY = /require\("react-native-worklets\/\.worklets\/\d+\.js"\)\.default/;

function joinedFiles(files) {
  return files.map((f) => f.content).join('\n');
}

test('referenced worklet: const f = () => {...}; useAnimatedStyle(f) workletizes f', () => {
  const input = `
    import { useAnimatedStyle } from 'react-native-reanimated';
    const handler = () => ({ width: 100 });
    function Box() {
      const style = useAnimatedStyle(handler);
    }
  `;
  const { code } = transform(input, 'test.js', {});
  // The `handler` declaration itself must be replaced with a factory require.
  assert.match(code, /const handler = require\("react-native-worklets\/\.worklets\/\d+\.js"\)\.default/);
});

test('referenced worklet: function declaration handler', () => {
  const input = `
    import { useAnimatedStyle } from 'react-native-reanimated';
    function handler() { return { width: 100 }; }
    function Box() {
      const style = useAnimatedStyle(handler);
    }
  `;
  const { code, files } = transform(input, 'test.js', {});
  assert.match(code, REQUIRE_FACTORY);
  assert.match(joinedFiles(files), /__workletHash/);
});

test('async worklet preserves async on inner factory function', () => {
  const input = `
    async function fetchSomething() {
      'worklet';
      return await Promise.resolve(1);
    }
  `;
  const { files } = transform(input, 'test.js', {});
  // Inner-fn declaration inside the factory should be `async function`.
  assert.match(joinedFiles(files), /const fetchSomething = async function/);
});

test('generator worklet preserves generator on inner factory function', () => {
  const input = `
    function* iterator() {
      'worklet';
      yield 1;
    }
  `;
  const { files } = transform(input, 'test.js', {});
  assert.match(joinedFiles(files), /const iterator = function\*/);
});

test('no-worklet-closure directive is stripped from outer body', () => {
  const input = `
    function noClosure() {
      'worklet';
      'no-worklet-closure';
      return 1;
    }
  `;
  const { files } = transform(input, 'test.js', { disableSourceMaps: true });
  const content = joinedFiles(files);
  // Directive must not survive into the stringified worklet body. Source
  // maps embed the original source verbatim (which contains the directive),
  // so disable them when grepping the output for parity.
  assert.doesNotMatch(content, /no-worklet-closure/);
  // __closure must be empty literal.
  assert.match(content, /__closure\s*=\s*\{\s*\}/);
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
  const { files } = transform(input, 'test.js', { disableSourceMaps: true });
  assert.doesNotMatch(joinedFiles(files), /no-worklet-closure/);
});

test('idempotent: running plugin twice equals running once', () => {
  const input = `
    function foo() { 'worklet'; return 1; }
  `;
  const first = transform(input, 'test.js', {});
  const second = transform(first.code, 'test.js', {});
  assert.equal(second.code, first.code);
  assert.equal(second.files.length, 0, 'idempotent second pass should not re-emit');
});

test('recursive worklet emits inner-fn binding that resolves naturally', () => {
  // Bundle mode keeps the inner factory in a real JS file, so recursive
  // references to the worklet name resolve via the inner `const fact = ...`
  // binding directly — no `this._recur` indirection needed (that was a
  // workaround for the old body-string-evaluated-on-UI-thread path).
  const input = `
    function fact(n) {
      'worklet';
      return n <= 1 ? 1 : n * fact(n - 1);
    }
  `;
  const { files } = transform(input, 'test.js', {});
  const content = joinedFiles(files);
  assert.match(content, /const fact = function/);
  assert.match(content, /fact\(n - 1\)/);
});

test('JSX element name is captured into closure', () => {
  const input = `
    import React from 'react';
    function Custom(props) { return null; }
    function W() {
      'worklet';
      return <Custom />;
    }
  `;
  const { files } = transform(input, 'test.tsx', {});
  const closureMatch = joinedFiles(files).match(/__closure\s*=\s*\{([^}]*)\}/);
  assert.ok(closureMatch, '__closure not found');
  assert.match(closureMatch[1], /Custom/);
});

test('globals (null, this) are not captured into closure', () => {
  const input = `
    function w() {
      'worklet';
      return null;
    }
  `;
  const { files } = transform(input, 'test.js', {});
  const closureMatch = joinedFiles(files).match(/__closure\s*=\s*\{([^}]*)\}/);
  assert.ok(closureMatch);
  assert.doesNotMatch(closureMatch[1], /\bnull\b/);
});

test('extraPlugins option does not throw and emits a stderr warning', () => {
  const input = `function foo() { 'worklet'; return 1; }`;
  // The warning is emitted to stderr once per process. Just ensure transform
  // doesn't reject the option.
  const { files } = transform(input, 'test.js', { extraPlugins: ['babel-plugin-foo'] });
  assert.match(joinedFiles(files), /__workletHash/);
});

test('MOCK_VERSION env gate: without env, __pluginVersion comes from opts', () => {
  delete process.env.WORKLETS_JEST_SHOULD_MOCK_VERSION;
  const input = `function foo() { 'worklet'; return 1; }`;
  const { files } = transform(input, 'test.js', { pluginVersion: '1.2.3' });
  const content = joinedFiles(files);
  assert.match(content, /__pluginVersion\s*=\s*"1\.2\.3"/);
  assert.doesNotMatch(content, /__pluginVersion\s*=\s*"x\.y\.z"/);
});

test('MOCK_VERSION env gate: with env=1, mock wins', () => {
  process.env.WORKLETS_JEST_SHOULD_MOCK_VERSION = '1';
  try {
    const input = `function foo() { 'worklet'; return 1; }`;
    const { files } = transform(input, 'test.js', { pluginVersion: '1.2.3' });
    assert.match(joinedFiles(files), /__pluginVersion\s*=\s*"x\.y\.z"/);
  } finally {
    delete process.env.WORKLETS_JEST_SHOULD_MOCK_VERSION;
  }
});

test('MOCK_VERSION env gate: no env, no pluginVersion → fall back to baked version', () => {
  // The plugin lives inside the worklets package and bakes its
  // `package.json` version at build time (mirrors `REAL_VERSION` in the TS
  // plugin). Raw napi callers without an injected `pluginVersion` still get
  // a real version string instead of a silently-missing `__pluginVersion`.
  delete process.env.WORKLETS_JEST_SHOULD_MOCK_VERSION;
  const input = `function foo() { 'worklet'; return 1; }`;
  const { files } = transform(input, 'test.js', {});
  assert.match(joinedFiles(files), /__pluginVersion\s*=\s*"[^"]+"/);
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
  const { code, files } = transform(input, 'test.js', {});
  assert.match(code, REQUIRE_FACTORY);
  assert.match(joinedFiles(files), /__workletHash/);
});

test('gesture chain methods accept object literals (Gesture.Tap().onUpdate({...}))', () => {
  const input = `
    function C() {
      const g = Gesture.Tap().onUpdate({
        run(e) { return e.x; },
      });
    }
  `;
  const { code, files } = transform(input, 'test.js', {});
  assert.match(code, REQUIRE_FACTORY);
  assert.match(joinedFiles(files), /__workletHash/);
});

test('referenced worklet survives through gesture chain', () => {
  const input = `
    const handler = (e) => e.x;
    function C() {
      const g = Gesture.Tap().onUpdate(handler);
    }
  `;
  const { code } = transform(input, 'test.js', {});
  assert.match(code, /const handler = require\("react-native-worklets\/\.worklets\/\d+\.js"\)\.default/);
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
  assert.match(code, /const handler = require\("react-native-worklets\/\.worklets\/\d+\.js"\)\.default/);
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
  assert.match(code, /const onScroll = require\("react-native-worklets\/\.worklets\/\d+\.js"\)\.default/);
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
  const { files } = transform(input, 'test.js', {});
  assert.match(joinedFiles(files), /__workletHash/);
});

test('cjs file extension parses as plain JS (no TSX cast handling)', () => {
  // .cjs / .mjs used to fall back to TSX parser which accepts unusual syntax.
  // The cjs path must work as ordinary JS — round-trip a plain require.
  const input = `const x = require('y');`;
  const { code } = transform(input, 'test.cjs', {});
  assert.match(code, /require\("y"\)/);
});

test('worklet-only directives are stripped from every nested expression position', () => {
  const input = `
    async function outer() {
      'worklet';
      const a = await (async function () { 'limit-init-data-hoisting'; return 1; })();
      const b = tag\`x\${function () { 'no-worklet-closure'; return 2; }}\`;
      const c = [...[function () { 'no-worklet-closure'; return 3; }]];
      return a + b + c;
    }
  `;
  const { files } = transform(input, 'test.js', {});
  const content = joinedFiles(files);
  assert.doesNotMatch(content, /limit-init-data-hoisting/);
  assert.doesNotMatch(content, /no-worklet-closure/);
  assert.match(content, /await \(async function\(\) \{\s*return 1;?\s*\}\)\(\)/);
  assert.match(content, /return 2;/);
  assert.match(content, /return 3;/);
  assert.match(content, /return a \+ b \+ c;/);
});

test('object of callbacks reached through an identifier gets workletized', () => {
  const input = `
    import { useAnimatedScrollHandler } from 'react-native-reanimated';
    const handlers = { onScroll(e) { console.log(e); } };
    function A() { return useAnimatedScrollHandler(handlers); }
  `;
  const { code, files } = transform(input, 'test.js', {});
  assert.match(code, /onScroll: require\("react-native-worklets\/\.worklets\/\d+\.js"\)\.default/);
  assert.equal(files.length, 1);
});

test('nested worklet behind a non-worklet function propagates its closure', () => {
  const input = `
    const C = 1;
    function outer() { 'worklet';
      function h() { const i = () => { 'worklet'; return C; }; return i(); }
      return h();
    }
  `;
  const { code, files } = transform(input, 'test.js', {});
  assert.match(code, /\.default\(\{ C \}\)/);
  const outer = files.find((f) => f.content.includes('outer_'));
  assert.match(outer.content, /outer\.__closure = \{ C \}/);
});

test('unbound identifiers are captured unless they are known globals', () => {
  const input = `function f() { 'worklet'; return globalStuff(Math.max(console.log(1))); }`;
  const { files } = transform(input, 'test.js', {});
  assert.match(joinedFiles(files), /f\.__closure = \{ globalStuff \}/);
});

test('custom globals are not captured', () => {
  const input = `function f() { 'worklet'; return myHostFn(); }`;
  const { files } = transform(input, 'test.js', { globals: ['myHostFn'] });
  assert.match(joinedFiles(files), /f\.__closure = \{\}/);
});

test('strictGlobal captures nothing unbound', () => {
  const input = `function f() { 'worklet'; return globalStuff(); }`;
  const { files } = transform(input, 'test.js', { strictGlobal: true });
  assert.match(joinedFiles(files), /f\.__closure = \{\}/);
});

test('an object with an accessor is an implicit context object', () => {
  const input = `'worklet';\nconst obj = { get foo() { return this.x; } };`;
  const { code } = transform(input, 'test.js', {});
  assert.match(code, /__workletContextObjectFactory/);
});

test('substituteWebPlatformChecks replaces platform checks outside worklets', () => {
  const input = `const a = isWeb();\nconst b = shouldBeUseWeb();`;
  const { code } = transform(input, 'test.js', {
    substituteWebPlatformChecks: true,
  });
  assert.match(code, /const a = true/);
  assert.match(code, /const b = true/);
});

test('substituteWebPlatformChecks is off by default', () => {
  const { code } = transform(`const a = isWeb();`, 'test.js', {});
  assert.match(code, /const a = isWeb\(\)/);
});

test('inline style shared value reads get a dev warning', () => {
  const input = `const C = () => <View style={{ width: sv.value }} />;`;
  const { code } = transform(input, 'test.jsx', {});
  assert.match(code, /getUseOfValueInStyleWarning/);
});

test('disableInlineStylesWarning suppresses the warning', () => {
  const input = `const C = () => <View style={{ width: sv.value }} />;`;
  const { code } = transform(input, 'test.jsx', {
    disableInlineStylesWarning: true,
  });
  assert.doesNotMatch(code, /getUseOfValueInStyleWarning/);
});

test('a name bound inside the outer worklet is not force-captured by it', () => {
  const input = `
    function outer() { 'worklet';
      function mid(p) { return () => { 'worklet'; return p; }; }
      return mid;
    }
  `;
  const { code, files } = transform(input, 'test.js', {});
  assert.match(code, /\.default\(\{\}\)/);
  const outer = files.find((f) => f.content.includes('outer_'));
  assert.match(outer.content, /outer\.__closure = \{\}/);
});

test('a block-scoped name inside the outer worklet is not force-captured', () => {
  const input = `
    function outer() { 'worklet';
      { const dup = 2; return () => { 'worklet'; return dup; }; }
    }
  `;
  const { files } = transform(input, 'test.js', {});
  const outer = files.find((f) => f.content.includes('outer_'));
  assert.match(outer.content, /outer\.__closure = \{\}/);
});

test('assignment targets are written, not referenced', () => {
  const input = `let m = 0;\nfunction f() { 'worklet'; m = 1; }`;
  const { files } = transform(input, 'test.js', {});
  assert.match(joinedFiles(files), /f\.__closure = \{\}/);
});

test('an unbound assignment target is not captured either', () => {
  const input = `function f() { 'worklet'; unboundA = 1; }`;
  const { code } = transform(input, 'test.js', {});
  assert.match(code, /\.default\(\{\}\)/);
});

test('for-of targets are still referenced', () => {
  const input = `let m;\nfunction f() { 'worklet'; for (m of [1]) {} }`;
  const { files } = transform(input, 'test.js', {});
  assert.match(joinedFiles(files), /f\.__closure = \{ m \}/);
});

test('destructuring assignment captures defaults but not bindings', () => {
  const input = `let m, d = 5;\nfunction f() { 'worklet'; ({ m = d } = {}); }`;
  const { files } = transform(input, 'test.js', {});
  const closure = joinedFiles(files).match(/f\.__closure = \{[^}]*\}/)[0];
  assert.match(closure, /d/);
  assert.doesNotMatch(closure, /\bm\b/);
});

test('a worklet in a computed method key is workletized', () => {
  const input = `const g = 1;\nconst o = { [(() => { 'worklet'; return g; })()]() { return 1; } };`;
  const { code, files } = transform(input, 'test.js', {});
  assert.equal(files.length, 1);
  assert.match(code, /\[require\("react-native-worklets\/\.worklets\/\d+\.js"\)\.default\(\{ g \}\)\(\)\]/);
});

test('an import left empty by type-specifier stripping is dropped', () => {
  const { code } = transform(
    `import { type Props } from 'some-pkg';\nconst a = 1;`,
    'test.ts',
    {}
  );
  assert.doesNotMatch(code, /import "some-pkg"/);
});

test('a genuine side-effect import survives', () => {
  const { code } = transform(`import 'side-effect';\nconst a = 1;`, 'test.ts', {});
  assert.match(code, /import "side-effect"/);
});
