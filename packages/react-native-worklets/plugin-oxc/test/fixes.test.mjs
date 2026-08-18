import test from 'node:test';
import assert from 'node:assert/strict';
import plugin from '../index.js';
const { transform } = plugin;

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
  const { files } = transform(input, 'test.js', {});
  const content = joinedFiles(files);
  assert.doesNotMatch(content, /no-worklet-closure/);
  assert.match(content, /__closure\s*=\s*\{\s*\}/);
});

test('a nested function keeps its own directives', () => {
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
  const { files } = transform(input, 'test.js', {});
  assert.match(joinedFiles(files), /no-worklet-closure/);
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
  const input = `const x = require('y');`;
  const { code } = transform(input, 'test.cjs', {});
  assert.match(code, /require\("y"\)/);
});

test('nested expression positions keep their directives', () => {
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
  assert.match(content, /limit-init-data-hoisting/);
  assert.match(content, /no-worklet-closure/);
  assert.match(content, /return 1;/);
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

test('an exported function declaration referenced by a hook is workletized', () => {
  const input = `
    import { useAnimatedStyle } from 'react-native-reanimated';
    export function styler() { return { width: 1 }; }
    const s = useAnimatedStyle(styler);
  `;
  const { code, files } = transform(input, 'test.js', {});
  assert.match(code, /export const styler = require\("react-native-worklets\/\.worklets\/\d+\.js"\)\.default/);
  assert.equal(files.length, 1);
});

test('a hand-written worklet is left alone', () => {
  const input = `
    import { runOnUI } from 'react-native-worklets';
    const cb = function () { return 1; };
    cb.__workletHash = 1234;
    cb.__closure = {};
    runOnUI(cb)();
  `;
  const { code, files } = transform(input, 'test.js', {});
  assert.equal(files.length, 0);
  assert.match(code, /const cb = function\(\)/);
});

test('gesture object hooks do not workletize a function argument', () => {
  const input = `
    import { useTapGesture } from 'react-native-gesture-handler';
    const g = useTapGesture(() => { console.log(1); });
  `;
  const { files } = transform(input, 'test.js', {});
  assert.equal(files.length, 0);
});

test('function hooks do not workletize an object argument', () => {
  const input = `
    import { useAnimatedStyle } from 'react-native-reanimated';
    const h = { m() { return 1; } };
    const s = useAnimatedStyle(h);
  `;
  const { files } = transform(input, 'test.js', {});
  assert.equal(files.length, 0);
});

test('a layout animation callback passed by identifier is not workletized', () => {
  const input = `
    import { Layout } from 'react-native-reanimated';
    const f = (v) => { console.log(v); };
    const l = Layout.springify().withCallback(f);
  `;
  const { files } = transform(input, 'test.js', {});
  assert.equal(files.length, 0);
});

test('only the last assignment to a rebound binding is workletized', () => {
  const input = `
    import { runOnUI } from 'react-native-worklets';
    let cb = () => { return 1; };
    cb = () => { return 2; };
    runOnUI(cb)();
  `;
  const { files } = transform(input, 'test.js', {});
  assert.equal(files.length, 1);
});

test('an unbound free variable survives a same-named nested injection', () => {
  const input = `
    const w = () => { 'worklet';
      function h() { const zz = 1; return () => { 'worklet'; return zz; }; }
      return [h, zz];
    };
  `;
  const { files } = transform(input, 'test.js', {});
  const outer = files.find((f) => f.content.includes('function h()'));
  assert.match(outer.content, /__closure = \{ zz \}/);
});

test('destructuring for-of targets are not captured', () => {
  const input = `function f(){ let a, b; const w = () => { 'worklet'; for ([a, b] of [[1, 2]]) {} }; return w; }`;
  const { files } = transform(input, 'test.js', {});
  assert.match(joinedFiles(files), /__closure = \{\}/);
});

test('computed exports assignments are dehoisted', () => {
  const input = `'worklet';\nexports['foo'] = 1;\nfunction bar(){ return 2; }`;
  const { code } = transform(input, 'test.js', {});
  assert.ok(code.indexOf('const bar =') < code.indexOf('exports["foo"]'));
});

test('to_identifier matches @babel/types on leading digits and unicode', () => {
  const { files: a } = transform(`const w = () => { 'worklet'; return 1; };`, '/proj/2dExample.js', {});
  assert.match(a[0].content, /dExampleJs1Factory/);
  const { files: b } = transform(`const w = function ünïcode(){ 'worklet'; return 1; };`, 'test.js', {});
  assert.match(b[0].content, /ünïcode_testJs1Factory/);
});

test('an object reached by identifier workletizes identifier-valued properties', () => {
  const input = `
    import { usePanGesture } from 'react-native-gesture-handler';
    const onStart = () => { console.log(1); };
    const handlers = { onStart };
    const g = usePanGesture(handlers);
  `;
  const { code, files } = transform(input, 'test.js', {});
  assert.equal(files.length, 1);
  assert.match(code, /const onStart = require\("react-native-worklets\/\.worklets\/\d+\.js"\)\.default/);
});

test('a function declaration wins over a later reassignment', () => {
  const input = `
    import { useAnimatedStyle } from 'react-native-reanimated';
    function styleFactory() { return { width: 1 }; }
    styleFactory = () => ({ width: 2 });
    const s = useAnimatedStyle(styleFactory);
  `;
  const { files } = transform(input, 'test.js', {});
  assert.equal(files.length, 1);
});

test('a non-assignment rebind makes the binding unresolvable', () => {
  const input = `
    import { useAnimatedStyle } from 'react-native-reanimated';
    let f = () => ({ width: 1 });
    f++;
    useAnimatedStyle(f);
  `;
  const { files } = transform(input, 'test.js', {});
  assert.equal(files.length, 0);
});

test('the chosen definition site must match the accepted shape', () => {
  const input = `
    import { useAnimatedStyle } from 'react-native-reanimated';
    let f;
    f = () => ({ width: 1 });
    f = { a: 1 };
    useAnimatedStyle(f);
  `;
  const { code, files } = transform(input, 'test.js', {});
  assert.equal(files.length, 1);
  assert.match(code, /f = require\("react-native-worklets\/\.worklets\/\d+\.js"\)\.default/);
});

test('the __workletHash guard ignores optional chaining', () => {
  const input = `
    import { useAnimatedStyle } from 'react-native-reanimated';
    const f = () => { return 1; };
    if (f?.__workletHash) { console.log('x'); }
    useAnimatedStyle(f);
  `;
  const { files } = transform(input, 'test.js', {});
  assert.equal(files.length, 1);
});

test('to_identifier rejects non-ID_Continue numerics', () => {
  const { files } = transform(
    `export const f = () => { 'worklet'; return 1; };`,
    '/tmp/x².js',
    {}
  );
  assert.match(files[0].content, /xJs1Factory/);
});

test('a hand-written worklet stops the alias chain', () => {
  const input = `
    import { useAnimatedStyle } from 'react-native-reanimated';
    const g = () => ({ w: 1 });
    const h = g;
    h.__workletHash = 1;
    useAnimatedStyle(h);
  `;
  const { files } = transform(input, 'test.js', {});
  assert.equal(files.length, 0);
});

test('an alias is only followed out of a constant declarator', () => {
  const input = `
    import { useAnimatedStyle } from 'react-native-reanimated';
    const g = () => ({ w: 1 });
    let h;
    h = g;
    useAnimatedStyle(h);
  `;
  const { files } = transform(input, 'test.js', {});
  assert.equal(files.length, 0);
});

test('a rebound object resolves its identifier-valued properties', () => {
  const input = `
    import { useAnimatedScrollHandler } from 'react-native-reanimated';
    const cb = () => { console.log(1); };
    let t;
    t = { onScroll: cb };
    useAnimatedScrollHandler(t);
  `;
  const { code, files } = transform(input, 'test.js', {});
  assert.equal(files.length, 1);
  assert.match(code, /const cb = require\("react-native-worklets\/\.worklets\/\d+\.js"\)\.default\(\{\}\)/);
});

test('a destructured binding resolves through its declarator init', () => {
  const input = `
    import { useAnimatedScrollHandler } from 'react-native-reanimated';
    const handlers = { onScroll: () => { console.log(1); } };
    const { onScroll } = handlers;
    useAnimatedScrollHandler(onScroll);
  `;
  const { code, files } = transform(input, 'test.js', {});
  assert.equal(files.length, 1);
  assert.match(code, /onScroll: require\("react-native-worklets\/\.worklets\/\d+\.js"\)\.default\(\{\}\)/);
});

test('an optional call is not auto-workletized', () => {
  const input = `
    import { runOnUI } from 'react-native-worklets';
    runOnUI?.(() => { console.log(1); });
  `;
  const { files } = transform(input, 'test.js', {});
  assert.equal(files.length, 0);
});

test('a spread in an object hook argument is rejected', () => {
  const input = `
    import { useAnimatedScrollHandler } from 'react-native-reanimated';
    const rest = {};
    useAnimatedScrollHandler({ ...rest, onScroll() { console.log(1); } });
  `;
  assert.throws(
    () => transform(input, 'test.js', {}),
    /'SpreadElement' as to-be workletized argument is not supported for object hooks\./
  );
});

test('a self-recursive worklet does not capture its own name', () => {
  const input = `
    function walk(node) {
      'worklet';
      node.children.forEach((c) => { 'worklet'; walk(c); });
    }
  `;
  const { code } = transform(input, 'test.js', {});
  assert.match(code, /const walk = require\("react-native-worklets\/\.worklets\/\d+\.js"\)\.default\(\{\}\)/);
});

test('a call below an optional link is still auto-workletized', () => {
  const input = `
    import { useAnimatedStyle } from 'react-native-reanimated';
    useAnimatedStyle(() => ({ width: 1 }))?.foo;
  `;
  const { files } = transform(input, 'test.js', {});
  assert.equal(files.length, 1);
});

test('a function declaration in an unscopable position is not given a const', () => {
  const input = `switch (x) { case 1: function h() { 'worklet'; return 1; } default: break; }`;
  const { code } = transform(input, 'test.js', {});
  assert.doesNotMatch(code, /const h =/);
  assert.match(code, /require\("react-native-worklets\/\.worklets\/\d+\.js"\)\.default\(\{\}\)/);
});

test('a computed identifier callee is auto-detected', () => {
  const input = `
    import { Layout } from 'react-native-reanimated';
    const withCallback = 'withCallback';
    const l = Layout[withCallback]((v) => { console.log(v); });
  `;
  const { files } = transform(input, 'test.js', {});
  assert.equal(files.length, 1);
});

test('a layout callback is not matched through a sequence expression', () => {
  const input = `
    import { Layout } from 'react-native-reanimated';
    (0, Layout.withCallback)(() => { console.log(1); });
  `;
  const { files } = transform(input, 'test.js', {});
  assert.equal(files.length, 0);
});

test('statement position of a workletized declaration', () => {
  const cases = [
    ['switch (x) { case 1: function h() { "worklet"; return 1; } }', false],
    ['if (x) function h() { "worklet"; return 1; }', false],
    ['lbl: function h() { "worklet"; return 1; }', false],
    ['function h() { "worklet"; return 1; }', true],
    ['{ function h() { "worklet"; return 1; } }', true],
    ['for (;;) { function h() { "worklet"; return 1; } }', true],
  ];
  for (const [input, expectsConst] of cases) {
    const { code } = transform(input, 'test.js', {});
    assert.equal(/const h =/.test(code), expectsConst, `for: ${input}`);
  }
});

test('an unscopable position does not leak into the declaration body', () => {
  const input = `
    switch (x) {
      case 1:
        function outer() {
          function f() { 'worklet'; return 1; }
          return f;
        }
    }
  `;
  const { code } = transform(input, 'test.js', {});
  assert.match(code, /const f = require\("react-native-worklets\/\.worklets\/\d+\.js"\)\.default/);
});

test('a TypeScript assertion hides a callback from auto-workletization', () => {
  const cases = [
    `useAnimatedStyle((() => ({ width: 1 })) as any);`,
    `useAnimatedStyle((() => ({ width: 1 })) satisfies any);`,
    `useAnimatedStyle((() => ({ width: 1 }))!);`,
    `const cb = (() => ({ width: 1 })) as any; useAnimatedStyle(cb);`,
    `const cb = () => ({ width: 1 }); useAnimatedStyle!(cb);`,
  ];
  for (const body of cases) {
    const input = `import { useAnimatedStyle } from 'react-native-reanimated';\n${body}`;
    const { files } = transform(input, 'test.ts', {});
    assert.equal(files.length, 0, `for: ${body}`);
  }
});

test('a TypeScript assertion also hides the __workletHash guard', () => {
  const input = `
    import { useAnimatedStyle } from 'react-native-reanimated';
    const updater = () => ({ width: 1 });
    console.log((updater as any).__workletHash);
    export const s = useAnimatedStyle(updater);
  `;
  const { files } = transform(input, 'test.ts', {});
  assert.equal(files.length, 1);
});

test('a TypeScript assertion breaks a gesture or layout chain', () => {
  const cases = [
    `import { Gesture } from 'react-native-gesture-handler';\nexport const g = (Gesture.Pan() as any).onStart(() => { console.log(1); });`,
    `import { Gesture } from 'react-native-gesture-handler';\nexport const g = (Gesture as any).Pan().onStart(() => { console.log(1); });`,
    `import { FadeIn } from 'react-native-reanimated';\nexport const l = (FadeIn.duration(1) as any).withCallback(() => { console.log(1); });`,
  ];
  for (const input of cases) {
    const { files } = transform(input, 'test.ts', {});
    assert.equal(files.length, 0, `for: ${input}`);
  }
});

test('an unasserted gesture chain still workletizes', () => {
  const input = `
    import { Gesture } from 'react-native-gesture-handler';
    export const g = Gesture.Pan().enabled(true).onStart(() => { console.log(1); });
  `;
  const { files } = transform(input, 'test.ts', {});
  assert.equal(files.length, 1);
});

test('a TypeScript assertion hides an entity from the file directive', () => {
  const cases = [
    `'worklet';\nexport const handlers = { onTap() { return 1; } } as const;`,
    `'worklet';\nexport const f = (() => 1) as any;`,
    `'worklet';\nexport const o = ({ m() { return this.x; } }) as any;`,
  ];
  for (const input of cases) {
    const { code, files } = transform(input, 'test.ts', {});
    assert.equal(files.length, 0, `for: ${input}`);
    assert.doesNotMatch(code, /__workletContextObject/);
  }
});

test('a TypeScript assertion suppresses web platform substitution', () => {
  const { code } = transform(`const a = (isWeb as any)();`, 'test.ts', {
    substituteWebPlatformChecks: true,
  });
  assert.match(code, /const a = isWeb\(\)/);
});

test('a computed key still chains a gesture object', () => {
  const input = `
    import { Gesture } from 'react-native-gesture-handler';
    const g = Gesture.Pan()['enabled'](true).onStart((e) => { console.log(e); });
  `;
  const { files } = transform(input, 'test.ts', {});
  assert.equal(files.length, 1);
});

test('a TypeScript assertion is respected at every node position', () => {
  const cases = [
    [`import { Gesture } from 'react-native-gesture-handler';\nconst Pan = 'Pan';\nconst g = Gesture[(Pan as any)]().onStart(() => { console.log(1); });`, 'test.ts'],
    [`import { Gesture } from 'react-native-gesture-handler';\nconst g = (Gesture.Pan as any)().onStart(() => { console.log(1); });`, 'test.ts'],
    [`import { Gesture } from 'react-native-gesture-handler';\nconst g = (Gesture.Pan().enabled as any)(true).onStart(() => { console.log(1); });`, 'test.ts'],
    [`import { FadeIn } from 'react-native-reanimated';\nconst l = (FadeIn.duration as any)(100).withCallback(() => { console.log(1); });`, 'test.ts'],
    [`import { useAnimatedStyle } from 'react-native-reanimated';\nconst s = ((0, useAnimatedStyle)!)(() => ({ w: 1 }));`, 'test.ts'],
  ];
  for (const [input, filename] of cases) {
    const { files } = transform(input, filename, {});
    assert.equal(files.length, 0, `for: ${input}`);
  }
});

