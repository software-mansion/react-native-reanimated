import test from 'node:test';
import assert from 'node:assert/strict';
import plugin from '../index.js';
const { transform } = plugin;

test('mock source map is emitted when env var is set', () => {
  process.env.REANIMATED_JEST_SHOULD_MOCK_SOURCE_MAP = '1';
  try {
    const input = `function foo() { 'worklet'; return 1; }`;
    const { code } = transform(input, 'test.js', {});
    assert.match(code, /sourceMap:\s*"mock source map"/, `Got:\n${code}`);
  } finally {
    delete process.env.REANIMATED_JEST_SHOULD_MOCK_SOURCE_MAP;
  }
});

test('disableSourceMaps omits the sourceMap field', () => {
  const input = `function foo() { 'worklet'; return 1; }`;
  const { code } = transform(input, 'test.js', { disableSourceMaps: true });
  assert.doesNotMatch(code, /sourceMap:/);
});

test('real source map is a valid JSON v3 with mappings', () => {
  const input = `function foo(x) { 'worklet'; return x + 2; }`;
  const { code } = transform(input, 'test.js', {});
  // Extract the sourceMap string literal
  const m = code.match(/sourceMap:\s*"((?:[^"\\]|\\.)*)"/);
  assert.ok(m, `expected a sourceMap field. Got:\n${code}`);
  // The string is JSON-encoded inside a JS string literal; un-escape.
  const jsonText = JSON.parse('"' + m[1] + '"');
  const parsed = JSON.parse(jsonText);
  assert.equal(parsed.version, 3);
  assert.ok(Array.isArray(parsed.sources), 'sources must be an array');
  assert.ok(parsed.sources.includes('test.js'), `expected test.js in sources; got ${JSON.stringify(parsed.sources)}`);
  assert.ok(typeof parsed.mappings === 'string', 'mappings must be a string');
  assert.ok(parsed.mappings.length > 0, 'mappings must be non-empty');
});

test('real source map preserves identifier names via "names"', () => {
  const input = `function foo(x) { 'worklet'; return x + 2; }`;
  const { code } = transform(input, 'test.js', {});
  const m = code.match(/sourceMap:\s*"((?:[^"\\]|\\.)*)"/);
  const parsed = JSON.parse(JSON.parse('"' + m[1] + '"'));
  assert.ok(Array.isArray(parsed.names), 'names must be an array');
});

test('relative require inside bundle-mode worklet body gets rebased', () => {
  // The file lives at <root>/node_modules/react-native-worklets/src/foo.js,
  // so a `require('./helper')` inside a worklet body should resolve to
  // `../src/helper` relative to `<root>/node_modules/react-native-worklets/.worklets/`.
  const input = `
    function foo() {
      'worklet';
      const h = require('./helper');
      return h.go();
    }
  `;
  const { files } = transform(
    input,
    '/proj/node_modules/react-native-worklets/src/foo.js',
    { bundleMode: true }
  );
  assert.equal(files.length, 1);
  assert.match(
    files[0].content,
    /require\(["']\.\.\/src\/helper["']\)/,
    `Got file:\n${files[0].content}`
  );
});

test('relativeSourceLocation rewrites __initData.location', () => {
  const input = `function foo(x) { 'worklet'; return x; }`;
  const { code } = transform(input, '/proj/src/foo.js', {
    relativeSourceLocation: true,
    cwd: '/proj',
  });
  assert.match(code, /location:\s*"src\/foo\.js"/, `Got:\n${code}`);
});

test('relativeSourceLocation also rewrites source map sources entry', () => {
  const input = `function foo(x) { 'worklet'; return x; }`;
  const { code } = transform(input, '/proj/src/foo.js', {
    relativeSourceLocation: true,
    cwd: '/proj',
  });
  const m = code.match(/sourceMap:\s*"((?:[^"\\]|\\.)*)"/);
  assert.ok(m, `expected sourceMap. Got:\n${code}`);
  const parsed = JSON.parse(JSON.parse('"' + m[1] + '"'));
  assert.ok(
    parsed.sources.includes('src/foo.js'),
    `expected relative source. Got sources=${JSON.stringify(parsed.sources)}`
  );
  assert.ok(
    !parsed.sources.includes('/proj/src/foo.js'),
    `absolute path leaked. Got sources=${JSON.stringify(parsed.sources)}`
  );
});

test('relative require in non-workletizable file is left alone', () => {
  const input = `
    function foo() {
      'worklet';
      const h = require('./helper');
      return h.go();
    }
  `;
  const { files } = transform(input, '/proj/src/foo.js', { bundleMode: true });
  assert.equal(files.length, 1);
  assert.match(
    files[0].content,
    /require\(["']\.\/helper["']\)/,
    `Got file:\n${files[0].content}`
  );
});
