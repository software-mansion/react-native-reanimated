import test from 'node:test';
import assert from 'node:assert/strict';
import plugin from '../index.js';
const { transform } = plugin;

test('relative require inside worklet body gets rebased when source lives in workletizable module', () => {
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
