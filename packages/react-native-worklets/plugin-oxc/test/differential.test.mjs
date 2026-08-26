import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertParity, compareEmitted } from './differential.mjs';

const CASES = [
  [
    'const h = { onScroll(e) { console.log(e); } };\nuseAnimatedScrollHandler(h);',
  ],
  [
    'const cb = (e) => e;\nconst h = { onScroll: cb };\nuseAnimatedScrollHandler(h);',
  ],
  [
    'const h = { onScroll: () => 1 };\nconst { onScroll } = h;\nuseAnimatedScrollHandler(onScroll);',
  ],
  [
    'function styler() { return { width: 1 }; }\nstyleFactory = () => ({ width: 2 });\nuseAnimatedStyle(styler);',
  ],
  [
    'const cb = function () { return 1; };\ncb.__workletHash = 1;\nrunOnUI(cb)();',
  ],
  ['let f;\nf = () => ({ w: 1 });\nf = { a: 1 };\nuseAnimatedStyle(f);'],
  ['useTapGesture(() => { console.log(1); });'],
  [
    'const f = (v) => { console.log(v); };\nLayout.springify().withCallback(f);',
  ],
  ["Gesture.Pan()['enabled'](true).onStart((e) => { console.log(e); });"],
  ['(0, Layout.withCallback)(() => { console.log(1); });'],
  ['useAnimatedStyle(() => ({ width: 1 }))?.foo;'],
  ['Gesture?.Tap().onStart(() => { s(); })?.onEnd(() => { e(); });'],
  [
    'function outer() { "worklet"; function mid(p) { return () => { "worklet"; return p; }; } return mid; }',
  ],
  [
    'function walk(n) { "worklet"; n.forEach((c) => { "worklet"; walk(c); }); }',
  ],
  ['let m = 0;\nfunction f() { "worklet"; m = 1; }'],
  ['let a, b;\nconst w = () => { "worklet"; for ([a, b] of [[1, 2]]) {} };'],
  ['function f() { "worklet"; return globalStuff(Math.max(1)); }'],
  ['switch (x) { case 1: function h() { "worklet"; return 1; } }'],
  [
    'switch (x) { case 1: function o() { function f() { "worklet"; return 1; } return f; } }',
  ],
  [
    'function f() { "worklet"; function g() { "no-worklet-closure"; return 1; } return g; }',
  ],
  [
    'const a = (isWeb as any)();',
    'test.ts',
    { substituteWebPlatformChecks: true },
  ],
  [
    'let f;\n({ a: f } = { a: () => ({ w: 1 }) });\nuseAnimatedScrollHandler(f);',
  ],
  [
    'let h;\n({ h } = { onScroll: () => { console.log(1); } });\nuseAnimatedScrollHandler(h);',
  ],
  [
    'let a, b;\n[a = (b = 1)] = (() => { console.log(1); }) as any;\nuseAnimatedStyle(b);',
  ],
  [
    "import { helper } from 'react-native-worklets';\nhelper = null;\nfunction w() { 'worklet'; return helper; }",
  ],
  ['class Foo { bar(x) { "worklet"; return x + 2; } }'],
  ['class Foo { static bar(x) { "worklet"; return x + 2; } }'],
  ['const k = "m";\nclass Foo { [k]() { "worklet"; return 1; } }'],
  ['const a = 1;\nclass Foo { bar() { "worklet"; return a; } }'],
  ['class Foo { bar() { "worklet"; return () => { "worklet"; return 1; }; } }'],
  ['class Foo { bar = () => { "worklet"; return 1; }; }'],
  ['const C = () => <View style={{ width: sv.value }} />;', 'test.tsx'],
  [
    'const C = () => <View style={[{ width: sv.value } as any, { height: sv.value }]} />;',
    'test.tsx',
  ],
  [
    'const C = () => <View style={{ transform: [{ scale: sv.value }] }} />;',
    'test.tsx',
  ],
];

for (const [source, filename = 'test.ts', options] of CASES) {
  test(`parity: ${source.replace(/\n/g, ' ').slice(0, 70)}`, () => {
    assertParity(assert, source, filename, options);
  });
}

const here = path.dirname(fileURLToPath(import.meta.url));
const PACKAGES = path.join(here, '..', '..', '..');
const SWEEP_DIRS = [
  path.join(PACKAGES, 'react-native-reanimated', 'src'),
  path.join(PACKAGES, 'react-native-worklets', 'src'),
  path.join(PACKAGES, '..', 'apps', 'common-app', 'src'),
];

function collect(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(full, out);
    else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith('.d.ts'))
      out.push(full);
  }
  return out;
}

test(
  'parity across the repository source',
  { skip: !SWEEP_DIRS.every(fs.existsSync) },
  () => {
    const differing = [];
    for (const dir of SWEEP_DIRS) {
      for (const file of collect(dir)) {
        const source = fs.readFileSync(file, 'utf8');
        if (!compareEmitted(source, file).equal) differing.push(file);
      }
    }
    assert.deepEqual(differing, []);
  }
);
