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
    bundleMode: true,
    disableInlineStylesWarning: true,
    disableSourceMaps: true,
    disableWorkletClasses: false,
    extraPlugins: [],
    extraPresets: [],
    globals: ['myHostFn'],
    limitInitDataHoisting: true,
    omitNativeOnlyData: true,
    relativeSourceLocation: true,
    strictGlobal: false,
    substituteWebPlatformChecks: false,
    workletizableModules: ['my-lib'],
  });
  assert.match(code, /const a = 1/);
});

test('accepts undefined options', () => {
  const { code } = transform('const a = 1;', 'test.ts');
  assert.match(code, /const a = 1/);
});

test('substituteWebPlatformChecks replaces isWeb()/shouldBeUseWeb() with true', () => {
  const { code } = transform(
    'const a = isWeb(); const b = shouldBeUseWeb(); const c = other();',
    'test.ts',
    { substituteWebPlatformChecks: true }
  );
  assert.match(code, /const a = true/);
  assert.match(code, /const b = true/);
  assert.match(code, /const c = other\(\)/);
});

test('substituteWebPlatformChecks off by default', () => {
  const { code } = transform('const a = isWeb();', 'test.ts');
  assert.match(code, /isWeb\(\)/);
});

test('toggleBundleMode flips false to true in worklets entry-point', () => {
  const input = 'globalThis._WORKLETS_BUNDLE_MODE_ENABLED = false;';
  const { code } = transform(
    input,
    '/some/path/react-native-worklets/src/index.ts',
    { bundleMode: true }
  );
  assert.match(code, /_WORKLETS_BUNDLE_MODE_ENABLED = true/);
});

test('toggleBundleMode is a no-op in unrelated files', () => {
  const input = 'globalThis._WORKLETS_BUNDLE_MODE_ENABLED = false;';
  const { code } = transform(input, '/some/other/file.ts', { bundleMode: true });
  assert.match(code, /_WORKLETS_BUNDLE_MODE_ENABLED = false/);
});

test('inline-styles warning wraps sharedvalue.value in style prop', () => {
  process.env.NODE_ENV = 'development';
  const input = `const X = () => <Animated.View style={{ width: sv.value }} />;`;
  const { code } = transform(input, 'X.tsx', {});
  assert.match(code, /console\.warn/);
  assert.match(code, /getUseOfValueInStyleWarning/);
  assert.match(code, /return sv\.value/);
});

test('inline-styles warning is skipped when disabled', () => {
  process.env.NODE_ENV = 'development';
  const input = `const X = () => <Animated.View style={{ width: sv.value }} />;`;
  const { code } = transform(input, 'X.tsx', { disableInlineStylesWarning: true });
  assert.doesNotMatch(code, /console\.warn/);
});
