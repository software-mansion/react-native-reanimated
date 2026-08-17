import test from 'node:test';
import assert from 'node:assert/strict';
import plugin from '../index.js';
const { transform } = plugin;

test('parse + codegen passthrough preserves a simple function', () => {
  const input = `function foo(x) { return x + 2; }`;
  const { code } = transform(input, 'test.js', {});
  assert.match(code, /function foo/);
  assert.match(code, /return x \+ 2/);
});

test('handles TSX', () => {
  const input = `const F = () => <div className="x">hi</div>;`;
  const { code } = transform(input, 'test.tsx', {});
  assert.match(code, /className/);
});

test('parse error surfaces with [Worklets] prefix', () => {
  assert.throws(
    () => transform('const = ;', 'broken.js', {}),
    /\[Worklets\]/
  );
});

test('accepts every PluginOptions field without throwing', () => {
  const { code } = transform('const a = 1;', 'test.ts', {
    extraPlugins: [],
    extraPresets: [],
    importForwarding: { moduleNames: ['my-lib'], relativePaths: ['my-lib'] },
    globals: ['myHostFn'],
    strictGlobal: false,
    substituteWebPlatformChecks: false,
    disableInlineStylesWarning: false,
    envName: 'development',
    pluginVersion: '0.0.0',
    workletsPackageDir: '/tmp',
  });
  assert.match(code, /const a = 1/);
});

test('unknown options are ignored rather than rejected', () => {
  const { code } = transform('const a = 1;', 'test.ts', { notAnOption: true });
  assert.match(code, /const a = 1/);
});

test('accepts undefined options', () => {
  const { code } = transform('const a = 1;', 'test.ts');
  assert.match(code, /const a = 1/);
});

test('toggleBundleMode flips false to true in worklets entry-point', () => {
  const input = 'globalThis._WORKLETS_BUNDLE_MODE_ENABLED = false;';
  const { code } = transform(
    input,
    '/some/path/react-native-worklets/src/index.ts',
    {}
  );
  assert.match(code, /_WORKLETS_BUNDLE_MODE_ENABLED = true/);
});

test('toggleBundleMode is a no-op in unrelated files', () => {
  const input = 'globalThis._WORKLETS_BUNDLE_MODE_ENABLED = false;';
  const { code } = transform(input, '/some/other/file.ts', {});
  assert.match(code, /_WORKLETS_BUNDLE_MODE_ENABLED = false/);
});

test('function declaration with a worklet directive is extracted', () => {
  const { code, files } = transform(
    `function foo(x) { 'worklet'; return x + 1; }`,
    'test.js',
    {}
  );
  assert.match(code, /const foo = require\("react-native-worklets\/\.worklets\/\d+\.js"\)\.default/);
  assert.equal(files.length, 1);
});

test('arrow with a worklet directive is extracted', () => {
  const { code, files } = transform(
    `const foo = () => { 'worklet'; return 1; };`,
    'test.js',
    {}
  );
  assert.match(code, /const foo = require\("react-native-worklets\/\.worklets\/\d+\.js"\)\.default/);
  assert.equal(files.length, 1);
});

test('closure variables reach both the require call and the factory', () => {
  const input = `const a = 1;\nconst b = 2;\nfunction foo() { 'worklet'; return a + b; }`;
  const { code, files } = transform(input, 'test.js', {});
  assert.match(code, /\.default\(\{\s*a,\s*b\s*\}\)/);
  assert.match(files[0].content, /Factory\(\{\s*a,\s*b\s*\}\)/);
});

test('a hook callback is auto-workletized without a directive', () => {
  const input = `
    import { useAnimatedStyle } from 'react-native-reanimated';
    const s = useAnimatedStyle(() => ({ width: 1 }));
  `;
  const { files } = transform(input, 'test.js', {});
  assert.equal(files.length, 1);
});

test('code with no worklets emits nothing', () => {
  const { files } = transform(`function foo(x) { return x + 1; }`, 'test.js', {});
  assert.equal(files.length, 0);
});
