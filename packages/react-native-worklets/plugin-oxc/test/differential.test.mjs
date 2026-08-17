import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertParity, compareEmitted } from './differential.mjs';

const CASES = [
  ['const h = { onScroll(e) { console.log(e); } };\nuseAnimatedScrollHandler(h);'],
  ['const cb = (e) => e;\nconst h = { onScroll: cb };\nuseAnimatedScrollHandler(h);'],
  ['const h = { onScroll: () => 1 };\nconst { onScroll } = h;\nuseAnimatedScrollHandler(onScroll);'],
  ['function styler() { return { width: 1 }; }\nstyleFactory = () => ({ width: 2 });\nuseAnimatedStyle(styler);'],
  ['const cb = function () { return 1; };\ncb.__workletHash = 1;\nrunOnUI(cb)();'],
  ['let f;\nf = () => ({ w: 1 });\nf = { a: 1 };\nuseAnimatedStyle(f);'],
  ['useTapGesture(() => { console.log(1); });'],
  ['const f = (v) => { console.log(v); };\nLayout.springify().withCallback(f);'],
  ["Gesture.Pan()['enabled'](true).onStart((e) => { console.log(e); });"],
  ['(0, Layout.withCallback)(() => { console.log(1); });'],
  ['useAnimatedStyle(() => ({ width: 1 }))?.foo;'],
  ['Gesture?.Tap().onStart(() => { s(); })?.onEnd(() => { e(); });'],
  ['function outer() { "worklet"; function mid(p) { return () => { "worklet"; return p; }; } return mid; }'],
  ['function walk(n) { "worklet"; n.forEach((c) => { "worklet"; walk(c); }); }'],
  ['let m = 0;\nfunction f() { "worklet"; m = 1; }'],
  ['let a, b;\nconst w = () => { "worklet"; for ([a, b] of [[1, 2]]) {} };'],
  ['function f() { "worklet"; return globalStuff(Math.max(1)); }'],
  ['switch (x) { case 1: function h() { "worklet"; return 1; } }'],
  ['switch (x) { case 1: function o() { function f() { "worklet"; return 1; } return f; } }'],
  ['"worklet";\nconst obj = { get foo() { return this.x; } };'],
  ['"worklet";\nexports["foo"] = 1;\nfunction bar() { return 2; }'],
  ['const o = { __workletContextObject: true, inner: { __workletContextObject: true, m() { return this.x; } }, m() { return this.y; } };'],
  ['function f() { "worklet"; function g() { "no-worklet-closure"; return 1; } return g; }'],
  ['useAnimatedStyle((() => ({ width: 1 })) as any);'],
  ['const cb = () => ({ w: 1 });\nuseAnimatedStyle!(cb);'],
  ['const u = () => ({ w: 1 });\nconsole.log((u as any).__workletHash);\nuseAnimatedStyle(u);'],
  ['(Gesture.Pan() as any).onStart(() => { console.log(1); });'],
  ['(Gesture.Pan as any)().onStart(() => { console.log(1); });'],
  ['"worklet";\nexport const handlers = { onTap() { return 1; } } as const;'],
  ['const a = (isWeb as any)();', 'test.ts', { substituteWebPlatformChecks: true }],
  ['const s = ((0, useAnimatedStyle)!)(() => ({ w: 1 }));'],
  ['let a;\nconst w = () => { "worklet"; (a as any) = 1; };'],
  ['let f = () => ({ w: 0 });\n(f as any) = () => ({ w: 1 });\nuseAnimatedStyle(f);'],
  ['"worklet";\n(exports.foo as any) = 1;\nfunction bar() { return 2; }'],
  ['let f = () => ({ w: 1 });\n(f as any)++;\nuseAnimatedStyle(f);'],
  ['let f = () => ({ w: 1 });\n(f as any) = () => ({ w: 2 });\nf = () => ({ w: 3 });\nuseAnimatedStyle(f);'],
  ['let f = () => ({ w: 1 });\nf = () => ({ w: 3 });\n(f as any) = () => ({ w: 2 });\nuseAnimatedStyle(f);'],
  ['let f;\n({ a: f } = { a: () => ({ w: 1 }) });\nuseAnimatedScrollHandler(f);'],
  ['let h;\n({ h } = { onScroll: () => { console.log(1); } });\nuseAnimatedScrollHandler(h);'],
  ['let a, b;\n[a = (b = 1)] = (() => { console.log(1); }) as any;\nuseAnimatedStyle(b);'],
  ["const w = () => { 'worklet'; return { __workletContextObject: true, m() { return this.x; } }; };"],
  ["import { helper } from 'react-native-worklets';\nhelper = null;\nfunction w() { 'worklet'; return helper; }"],
  ['const C = () => <View style={{ width: sv.value }} />;', 'test.tsx'],
  ['const C = () => <View style={[{ width: sv.value } as any, { height: sv.value }]} />;', 'test.tsx'],
  ['const C = () => <View style={{ transform: [{ scale: sv.value }] }} />;', 'test.tsx'],
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
    else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith('.d.ts')) out.push(full);
  }
  return out;
}

test('parity across the repository source', { skip: !SWEEP_DIRS.every(fs.existsSync) }, () => {
  const differing = [];
  for (const dir of SWEEP_DIRS) {
    for (const file of collect(dir)) {
      const source = fs.readFileSync(file, 'utf8');
      if (!compareEmitted(source, file).equal) differing.push(file);
    }
  }
  assert.deepEqual(differing, []);
});
