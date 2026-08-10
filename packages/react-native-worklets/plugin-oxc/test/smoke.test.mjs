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

test('accepts all PluginOptions fields without throwing', () => {
  const { code } = transform('const a = 1;', 'test.ts', {
    disableSourceMaps: true,
    disableWorkletClasses: false,
    extraPlugins: [],
    extraPresets: [],
    globals: ['myHostFn'],
    limitInitDataHoisting: true,
    omitNativeOnlyData: true,
    importForwarding: { moduleNames: ['my-lib'], relativePaths: ['my-lib'] },
  });
  assert.match(code, /const a = 1/);
});

test('accepts undefined options', () => {
  const { code } = transform('const a = 1;', 'test.ts');
  assert.match(code, /const a = 1/);
});

test('toggleBundleMode flips false to true in worklets entry-point', () => {
  // Bundle mode is the only mode this plugin supports; the toggle fires
  // unconditionally in the worklets package entry-point so the runtime sees
  // the flag set regardless of which entry-point variant was bundled.
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

