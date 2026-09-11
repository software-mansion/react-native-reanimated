import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import plugin from '../index.js';

const { transform } = plugin;
const require_ = createRequire(import.meta.url);

test('the native binding loads and exposes transform', () => {
  assert.equal(typeof transform, 'function');
});

test('index.js resolves a platform-specific .node artifact', () => {
  const resolved = require_.resolve('../index.js');
  assert.match(resolved, /index\.js$/);
  assert.doesNotThrow(() => require_('../index.js'));
});

test('transform returns the documented result shape', () => {
  const result = transform(
    `function foo() { 'worklet'; return 1; }`,
    'test.js',
    {}
  );
  assert.deepEqual(
    Object.keys(result).sort(),
    ['changed', 'code', 'files', 'map'].sort()
  );
  assert.equal(typeof result.code, 'string');
  assert.equal(typeof result.changed, 'boolean');
  assert.ok(Array.isArray(result.files));
  assert.deepEqual(Object.keys(result.files[0]).sort(), ['content', 'path']);
});

test('parse + codegen round-trips a file it does not touch', () => {
  const { code, changed, files } = transform(
    'function foo(x) { return x + 2; }',
    'test.js',
    {}
  );
  assert.match(code, /function foo/);
  assert.equal(changed, false);
  assert.equal(files.length, 0);
});

test('handles TSX', () => {
  const { code } = transform(
    'const F = () => <div className="x">hi</div>;',
    'test.tsx',
    {}
  );
  assert.match(code, /className/);
});

test('a parse error crosses the boundary as a JS exception', () => {
  assert.throws(() => transform('const = ;', 'broken.js', {}), /\[Worklets\]/);
});

test('a rust panic crosses the boundary as a JS exception, not a crash', () => {
  assert.throws(
    () =>
      transform('function f() {}', 'test.js', {
        importForwarding: null,
      } as never),
    (error: unknown) => error instanceof Error
  );
});

test('accepts every PluginOptions field without throwing', () => {
  const { code } = transform('const a = 1;', 'test.ts', {
    extraPlugins: [],
    extraPresets: [],
    importForwarding: { moduleNames: ['my-lib'], relativePaths: ['my-lib'] },
    envName: 'development',
    pluginVersion: '0.0.0',
    workletsPackageDir: '/tmp',
  });
  assert.match(code, /const a = 1/);
});

test('unknown options are ignored rather than rejected', () => {
  const { code } = transform('const a = 1;', 'test.ts', {
    notAnOption: true,
  } as never);
  assert.match(code, /const a = 1/);
});

test('accepts undefined options', () => {
  const { code } = transform('const a = 1;', 'test.ts');
  assert.match(code, /const a = 1/);
});

test('windows-style paths are normalised before use', () => {
  const input = 'globalThis._WORKLETS_BUNDLE_MODE_ENABLED = false;';
  const { code } = transform(
    input,
    'C:\\proj\\node_modules\\react-native-worklets\\src\\index.ts',
    {}
  );
  assert.match(code, /_WORKLETS_BUNDLE_MODE_ENABLED = true/);
});

function joinedFiles(files: { path: string; content: string }[]) {
  return files.map((file) => file.content).join('\n');
}

test('extraPlugins is accepted and ignored by the transform', () => {
  const input = `function foo() { 'worklet'; return 1; }`;
  const { files } = transform(input, 'test.js', {
    extraPlugins: ['babel-plugin-foo'],
  });
  assert.match(joinedFiles(files), /__workletHash/);
});

test('__pluginVersion comes from opts', () => {
  const input = `function foo() { 'worklet'; return 1; }`;
  const { files } = transform(input, 'test.js', { pluginVersion: '1.2.3' });
  assert.match(joinedFiles(files), /__pluginVersion\s*=\s*"1\.2\.3"/);
});

test('__pluginVersion falls back to the baked version', () => {
  const input = `function foo() { 'worklet'; return 1; }`;
  const { files } = transform(input, 'test.js', {});
  assert.match(joinedFiles(files), /__pluginVersion\s*=\s*"[^"]+"/);
});

test('cjs file extension parses as plain JS (no TSX cast handling)', () => {
  const input = `const x = require('y');`;
  const { code } = transform(input, 'test.cjs', {});
  assert.match(code, /require\("y"\)/);
});

test('disableInlineStylesWarning suppresses the warning', () => {
  const input = `const C = () => <View style={{ width: sv.value }} />;`;
  const { code } = transform(input, 'test.jsx', {
    disableInlineStylesWarning: true,
  } as never);
  assert.doesNotMatch(code, /getUseOfValueInStyleWarning/);
});

test('to_identifier matches @babel/types on leading digits and unicode', () => {
  const { files: a } = transform(
    `const w = () => { 'worklet'; return 1; };`,
    '/proj/2dExample.js',
    {}
  );
  assert.match(a[0].content, /dExampleJs1Factory/);
  const { files: b } = transform(
    `const w = function ünïcode(){ 'worklet'; return 1; };`,
    'test.js',
    {}
  );
  assert.match(b[0].content, /ünïcode_testJs1Factory/);
});

test('to_identifier rejects non-ID_Continue numerics', () => {
  const { files } = transform(
    `export const f = () => { 'worklet'; return 1; };`,
    '/tmp/x².js',
    {}
  );
  assert.match(files[0].content, /xJs1Factory/);
});
