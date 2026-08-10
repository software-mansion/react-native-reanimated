import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { transformSync, parseSync, traverse } = require('@babel/core');
const generate = require('@babel/generator').default;

const babelPlugin = require('../../plugin/index.js');
const oxcPlugin = require('../babel.js');

process.env.WORKLETS_JEST_SHOULD_MOCK_VERSION = '1';

// Both plugins emit their worklet files through `fs.writeFileSync`. Capture
// them instead of writing so a parity run leaves no artifacts behind.
const realWriteFileSync = fs.writeFileSync;
let captured = [];

// TypeScript / JSX sources need the same syntax support both plugins get in a
// real Metro chain, otherwise Babel can't even parse the input.
function syntaxSupport(filename) {
  if (filename.endsWith('.tsx')) {
    return {
      presets: [['@babel/preset-typescript', { isTSX: true, allExtensions: true }]],
      plugins: [require.resolve('@babel/plugin-syntax-jsx')],
    };
  }
  if (filename.endsWith('.ts')) {
    return { presets: [require.resolve('@babel/preset-typescript')], plugins: [] };
  }
  return { presets: [], plugins: [] };
}

function run(plugin, source, filename, options) {
  captured = [];
  fs.writeFileSync = (path, content) => {
    captured.push({ path: String(path), content: String(content) });
  };
  const { presets, plugins } = syntaxSupport(filename);
  try {
    const result = transformSync(source, {
      filename,
      babelrc: false,
      configFile: false,
      compact: false,
      presets,
      plugins: [
        [plugin, { disableSourceMaps: true, bundleMode: true, ...options }],
        ...plugins,
      ],
    });
    return { code: result.code ?? '', files: captured.slice() };
  } finally {
    fs.writeFileSync = realWriteFileSync;
  }
}

// Worklet hashes are derived from each tool's own printed worklet string, so
// they legitimately differ. Blank them out, then re-print through a single
// generator so only structural differences survive. Dropping `extra` makes
// the generator re-derive literal spelling instead of echoing each tool's
// quote style and numeric formatting.
function normalize(code) {
  const masked = code
    .replace(/\.worklets\/\d+\.js/g, '.worklets/HASH.js')
    .replace(/__workletHash = (?:0x[0-9a-fA-F]+|\d+)/g, '__workletHash = HASH')
    .replace(/_worklet_\d+_init_data/g, '_worklet_HASH_init_data');
  const ast = parseSync(masked, {
    babelrc: false,
    configFile: false,
    filename: 'normalized.js',
    sourceType: 'unambiguous',
    // Transformed output can still contain JSX — neither plugin compiles it.
    plugins: [require.resolve('@babel/plugin-syntax-jsx')],
  });
  traverse(ast, {
    'StringLiteral|NumericLiteral'(path) {
      delete path.node.extra;
    },
  });
  return generate(ast, { compact: false, comments: false }).code;
}

function normalizeFiles(files) {
  return files
    .map((file) => normalize(file.content))
    .sort()
    .join('\n/* --- next worklet file --- */\n');
}

const CORPUS = [
  ['function declaration', `function foo() { 'worklet'; var x = 1; }`],
  ['closure capture', `const a = 1; const b = 2; function foo() { 'worklet'; return a + b; }`],
  ['arrow', `const foo = () => { 'worklet'; return 1; };`],
  ['default and rest params', `function foo(a, b = 2, ...rest) { 'worklet'; return a + b + rest.length; }`],
  ['destructured params', `function foo({ a, b: [c] = [] }) { 'worklet'; return a + c; }`],
  ['object literal', `function foo() { 'worklet'; return { a: 1, 'b-c': 2, [1 + 1]: 3, d() { return 4; } }; }`],
  ['control flow', `function foo(n) { 'worklet'; if (n > 1) { for (let i = 0; i < n; i++) { n += i; } } else { while (n) n--; } return n; }`],
  ['try/catch/finally', `function foo() { 'worklet'; try { throw new Error('x'); } catch (e) { return e; } finally { g(); } }`],
  ['switch', `function foo(n) { 'worklet'; switch (n) { case 1: return 'a'; case 2: { return 'b'; } default: return 'c'; } }`],
  ['nested function', `function foo() { 'worklet'; const bar = function () { return 1; }; return bar(); }`],
  ['nested worklet', `function foo() { 'worklet'; const bar = function () { 'worklet'; return 1; }; return bar(); }`],
  ['async', `async function foo() { 'worklet'; await Promise.resolve(); return 1; }`],
  ['generator', `function* foo() { 'worklet'; yield 1; yield 2; }`],
  ['recursion', `function foo(n) { 'worklet'; return n > 0 ? foo(n - 1) : 0; }`],
  ['optional chaining', `function foo(o) { 'worklet'; return o?.a?.[0]?.(); }`],
  ['nullish and logical', `function foo(a, b) { 'worklet'; return a ? b ?? 1 : (a && b) || 2; }`],
  ['template literal', `function foo(n) { 'worklet'; return \`v\${n}\`; }`],
  ['spread and holes', `function foo(a) { 'worklet'; return [...a, 1, , 3]; }`],
  ['labeled break', `function foo() { 'worklet'; outer: for (;;) { break outer; } return 1; }`],
  ['for-in and for-of', `function foo(o) { 'worklet'; for (const k in o) {} for (const v of [1]) {} return 1; }`],
  ['assignment operators', `function foo(a) { 'worklet'; a += 1; a **= 2; a ||= 3; a ??= 4; return a; }`],
  ['class in body', `function foo() { 'worklet'; class A { m() { return 1; } } return new A(); }`],
  ['getter and setter', `function foo() { 'worklet'; return { get a() { return 1; }, set a(v) {} }; }`],
  ['nested arrows', `function foo() { 'worklet'; return [1].map((x) => x * 2).filter((x) => x > 1); }`],
  ['empty body', `function foo() { 'worklet'; }`],
  ['no-worklet-closure directive', `const x = 1; function foo() { 'worklet'; 'no-worklet-closure'; return x; }`],
  ['worklet returning JSX', `function foo() { 'worklet'; return <View style={{ width: 1 }} />; }`, { filename: 'test.tsx' }],
  ['worklet returning member JSX', `function foo() { 'worklet'; return <Lib.View />; }`, { filename: 'test.tsx' }],
  ['worklet returning intrinsic JSX', `function foo() { 'worklet'; return <view />; }`, { filename: 'test.tsx' }],
  ['two worklets in a file', `function foo() { 'worklet'; return 1; } function bar() { 'worklet'; return 2; }`],
  ['shadowed global', `function foo() { 'worklet'; const Math = 1; return Math; }`],
  ['object hook autoworkletization', `useAnimatedScrollHandler({ onScroll(e) { return e; } });`],
  ['callback autoworkletization', `useAnimatedStyle(() => { return { width: 1 }; });`],
  ['referenced worklet', `const cb = () => { return 1; }; useAnimatedStyle(cb);`],
  ['gesture chain', `Gesture.Tap().onUpdate((e) => { return e; });`],
  ['gesture chain with object literal', `Gesture.Tap().onUpdate({ foo() { return 1; } });`],
  ['multi-method object hook', `useAnimatedScrollHandler({ onScroll(e) { return e; }, onBeginDrag: (e) => e });`],
  ['useAnimatedReaction pair', `useAnimatedReaction(() => 1, (v) => { return v; });`],
  ['useFrameCallback', `useFrameCallback((info) => { return info.timeSinceFirstFrame; });`],
  ['createAnimatedPropAdapter', `createAnimatedPropAdapter((props) => { return props; }, ['a']);`],
  ['scheduleOnUI', `const v = 1; scheduleOnUI(() => { 'worklet'; return v; });`],
  ['nested worklet in autoworkletized callback', `useAnimatedStyle(() => { const inner = () => { 'worklet'; return 1; }; return { width: inner() }; });`],
  ['worklet as class field arrow', `class Foo { bar = () => { 'worklet'; return 1; }; }`],
  ['worklet context object', `const ctx = { __workletContextObject: true, m() { return 1; } };`],
  ['limit-init-data-hoisting', `function outer() { 'worklet'; const inner = function () { 'worklet'; 'limit-init-data-hoisting'; return 1; }; return inner(); }`],
  ['inline styles warning', `const C = () => <View style={{ width: sv.value }} />;`, { filename: 'test.tsx' }],
  ['inline styles warning in array', `const C = () => <View style={[{ width: sv.value }]} />;`, { filename: 'test.tsx' }],
  ['file-level worklet directive', `'worklet';\nfunction foo() { return 1; }\nconst bar = () => 2;`],
  ['typescript annotations', `function foo(a: number, b: string): number { 'worklet'; return a + b.length; }`, { filename: 'test.ts' }],
  ['typescript satisfies and as', `function foo(a: unknown) { 'worklet'; return (a as number) + 1; }`, { filename: 'test.ts' }],
  ['strictGlobal', `function foo() { 'worklet'; return Math.round(unknownGlobal); }`, { options: { strictGlobal: true } }],
  ['substituteWebPlatformChecks outside worklets', `const a = isWeb(); const b = shouldBeUseWeb();`, { options: { substituteWebPlatformChecks: true } }],
  ['substituteWebPlatformChecks inside a worklet', `function foo() { 'worklet'; return isWeb() ? shouldBeUseWeb() : 2; }`, { options: { substituteWebPlatformChecks: true } }],
  ['substituteWebPlatformChecks inside an autoworkletized callback', `useAnimatedStyle(() => { return { width: isWeb() ? 1 : 2 }; });`, { options: { substituteWebPlatformChecks: true } }],
  ['substituteWebPlatformChecks disabled', `function foo() { 'worklet'; return isWeb(); }`],
  ['inline styles warning inside a worklet', `function foo() { 'worklet'; return <View style={{ width: sv.value }} />; }`, { filename: 'test.tsx' }],
  ['custom globals', `function foo() { 'worklet'; return myHostFunction(); }`, { options: { globals: ['myHostFunction'] } }],
  ['omitNativeOnlyData', `function foo() { 'worklet'; return 1; }`, { options: { omitNativeOnlyData: true } }],
  ['relative require in body', `function foo() { 'worklet'; const h = require('./helper'); return h.x; }`, { filename: '/some-library/src/file.ts', options: { importForwarding: { relativePaths: ['some-library'] } } }],
  ['non-forwardable relative require', `function foo() { 'worklet'; const h = require('./helper'); return h.x; }`, { filename: '/other-pkg/src/file.ts' }],
  ['default import forwarding', `import helper from 'some-library';\nfunction foo() { 'worklet'; return helper(); }`, { options: { importForwarding: { moduleNames: ['some-library'] } } }],
  ['aliased named import forwarding', `import { helper as h } from 'some-library';\nfunction foo() { 'worklet'; return h(); }`, { options: { importForwarding: { moduleNames: ['some-library'] } } }],
  ['namespace import falls back to closure', `import * as lib from 'some-library';\nfunction foo() { 'worklet'; return lib.helper(); }`, { options: { importForwarding: { moduleNames: ['some-library'] } } }],
  ['non-forwardable import stays in closure', `import { helper } from 'other-library';\nfunction foo() { 'worklet'; return helper(); }`],
  ['exported worklet declaration', `export function foo() { 'worklet'; return 1; }`],
  ['default-exported worklet', `export default function foo() { 'worklet'; return 1; }`],
  ['worklet in nested block', `if (true) { function foo() { 'worklet'; return 1; } }`],
  ['worklet as call argument', `register(function () { 'worklet'; return 1; });`],
  ['arguments object', `function foo() { 'worklet'; return arguments.length; }`],
  ['this reference', `function foo() { 'worklet'; return this.x; }`],
  ['worklet with computed member closure', `const obj = { a: 1 }; function foo() { 'worklet'; return obj['a']; }`],
];

const AUTOWORKLETIZATION_FILE = 'test.js';

for (const [name, source, config = {}] of CORPUS) {
  test(`bundle-mode parity: ${name}`, () => {
    const filename = config.filename ?? AUTOWORKLETIZATION_FILE;
    const babelResult = run(babelPlugin, source, filename, config.options);
    const oxcResult = run(oxcPlugin, source, filename, config.options);

    assert.equal(
      oxcResult.files.length,
      babelResult.files.length,
      'emitted worklet file count differs'
    );
    assert.equal(
      normalize(oxcResult.code),
      normalize(babelResult.code),
      'transformed source differs'
    );
    assert.equal(
      normalizeFiles(oxcResult.files),
      normalizeFiles(babelResult.files),
      'emitted worklet file contents differ'
    );
  });
}

test('bundle-mode parity: import forwarding', () => {
  const source = `import { helper } from 'some-library';
function foo() { 'worklet'; return helper(); }`;
  const options = { importForwarding: { moduleNames: ['some-library'] } };
  const babelResult = run(babelPlugin, source, AUTOWORKLETIZATION_FILE, options);
  const oxcResult = run(oxcPlugin, source, AUTOWORKLETIZATION_FILE, options);

  assert.equal(normalize(oxcResult.code), normalize(babelResult.code));
  assert.equal(
    normalizeFiles(oxcResult.files),
    normalizeFiles(babelResult.files)
  );
});

test('bundle-mode parity: bundle mode flag toggle', () => {
  const source = `globalThis._WORKLETS_BUNDLE_MODE_ENABLED = false;`;
  for (const filename of [
    'react-native-worklets/src/index.ts',
    'react-native-worklets/src/debug/bundleMode.native.ts',
    'react-native-worklets/lib/module/index.js',
    'react-native-worklets/lib/module/debug/bundleMode.native.js',
    'someOtherFile.ts',
  ]) {
    const babelResult = run(babelPlugin, source, filename);
    const oxcResult = run(oxcPlugin, source, filename);
    assert.equal(
      normalize(oxcResult.code),
      normalize(babelResult.code),
      `toggle differs for ${filename}`
    );
  }
});

// ---------------------------------------------------------------------------
// Known divergences. Each is pinned so a future change to either plugin has to
// acknowledge it rather than silently drift.
// ---------------------------------------------------------------------------

// The OXC shim hands Babel a freshly parsed Program, so a downstream
// `@babel/preset-typescript` sees accurate scope info and elides the now
// unreferenced import. The Babel plugin mutates in place, leaving stale
// binding references that keep the import alive.
test('known divergence: TS import elision after worklet extraction', () => {
  const source = `import { helper } from './helper';
function foo() { 'worklet'; return helper(); }`;
  const filename = '/some-library/src/file.ts';
  const options = { importForwarding: { relativePaths: ['some-library'] } };

  const babelResult = run(babelPlugin, source, filename, options);
  assert.match(babelResult.code, /import \{ helper \}/);

  const oxcResult = run(oxcPlugin, source, filename, options);
  assert.doesNotMatch(oxcResult.code, /import \{ helper \}/);

  // The worklet file itself re-imports it either way, so the reference the
  // worklet body needs is never lost.
  assert.equal(
    normalizeFiles(oxcResult.files),
    normalizeFiles(babelResult.files)
  );
});

// Bundle Mode does not support worklet classes at all — `class.ts` bails out
// on `state.opts.bundleMode`. The OXC port extends that to `classMethod.ts`'s
// method-level rewrite rather than reproducing it: that path turns prototype
// methods into per-instance fields, and for a constructor it emits
// `class C { constructor = … }`, which is a SyntaxError Babel cannot re-parse.
const CLASS_MEMBERS = [
  ['instance method', `bar() { 'worklet'; return 1; }`],
  ['static method', `static bar() { 'worklet'; return 1; }`],
  ['getter', `get bar() { 'worklet'; return 1; }`],
  ['setter', `set bar(v) { 'worklet'; this.v = v; }`],
];

for (const [label, member] of CLASS_MEMBERS) {
  test(`known divergence: OXC leaves a worklet ${label} untouched`, () => {
    const source = `class Foo { ${member} }`;

    const babelResult = run(babelPlugin, source, AUTOWORKLETIZATION_FILE);
    assert.equal(babelResult.files.length, 1);
    assert.match(babelResult.code, /bar = require\(/);

    const oxcResult = run(oxcPlugin, source, AUTOWORKLETIZATION_FILE);
    assert.equal(oxcResult.files.length, 0);
    assert.doesNotMatch(oxcResult.code, /\.worklets\//);
  });
}

test('known divergence: Babel emits unparseable output for a worklet constructor', () => {
  const source = `class Foo { constructor(x) { 'worklet'; this.x = x; } }`;

  const babelResult = run(babelPlugin, source, AUTOWORKLETIZATION_FILE);
  assert.match(babelResult.code, /constructor = require\(/);
  assert.throws(
    () =>
      parseSync(babelResult.code, {
        babelrc: false,
        configFile: false,
        filename: 'reparse.js',
      }),
    /Classes may not have a field named 'constructor'/
  );

  const oxcResult = run(oxcPlugin, source, AUTOWORKLETIZATION_FILE);
  assert.equal(oxcResult.files.length, 0);
  assert.match(oxcResult.code, /constructor\(x\)/);
});
