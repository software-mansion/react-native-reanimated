import test from 'node:test';
import assert from 'node:assert/strict';
import plugin from '../index.js';
const { transform } = plugin;

// Bundle-only mode: the plugin emits factory definitions into individual
// `.worklets/<hash>.js` files. Source maps for those files are produced by
// the host bundler (Metro) — the plugin itself doesn't embed inline maps.

test('relative require inside worklet body gets rebased when source lives in workletizable module', () => {
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
    {}
  );
  assert.equal(files.length, 1);
  assert.match(
    files[0].content,
    /require\(["']\.\.\/src\/helper["']\)/,
    `Got file:\n${files[0].content}`
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
  const { files } = transform(input, '/proj/src/foo.js', {});
  assert.equal(files.length, 1);
  assert.match(
    files[0].content,
    /require\(["']\.\/helper["']\)/,
    `Got file:\n${files[0].content}`
  );
});
