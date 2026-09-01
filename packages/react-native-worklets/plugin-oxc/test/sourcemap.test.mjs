import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { transformSync } = require('@babel/core');
const { SourceMapConsumer } = require('source-map');

const babelPlugin = require('../../plugin/index.js');
const oxcPlugin = require('../babel.js');

const realWriteFileSync = fs.writeFileSync;

function run(plugin, source, filename, extra = {}) {
  realWriteFileSync(filename, source);
  fs.writeFileSync = () => {};
  try {
    return transformSync(source, {
      filename,
      babelrc: false,
      configFile: false,
      compact: false,
      sourceMaps: true,
      ...extra,
      presets: [
        [
          require.resolve('@babel/preset-typescript'),
          { isTSX: true, allExtensions: true },
        ],
      ],
      plugins: [
        [plugin, { bundleMode: true }],
        require.resolve('@babel/plugin-syntax-jsx'),
      ],
    });
  } finally {
    fs.writeFileSync = realWriteFileSync;
    fs.unlinkSync(filename);
  }
}

async function originalLines(result, tokens) {
  const lines = result.code.split('\n');
  const consumer = await new SourceMapConsumer(result.map);
  try {
    return tokens.map((token) => {
      const index = lines.findIndex((line) => line.includes(`${token} = `));
      if (index < 0) {
        return null;
      }
      return consumer.originalPositionFor({
        line: index + 1,
        column: lines[index].indexOf(token),
      }).line;
    });
  } finally {
    consumer.destroy?.();
  }
}

const SOURCE = [
  "import { useAnimatedStyle } from 'react-native-reanimated';",
  'const AAA = 1;',
  'function w1() {',
  "  'worklet';",
  '  return 1;',
  '}',
  'const BBB = 2;',
  'const C = () => <V style={useAnimatedStyle(() => {',
  '  return { width: AAA };',
  '})} />;',
  'const CCC = 3;',
  'function w2() {',
  "  'worklet';",
  '  return 2;',
  '}',
  'const DDD = 4;',
].join('\n');

const TOKENS = ['AAA', 'BBB', 'CCC', 'DDD'];
const TRUE_LINES = [2, 7, 11, 16];

test('source map survives worklet extraction', async () => {
  const filename = path.join(os.tmpdir(), 'worklets-oxc-sourcemap.tsx');
  const result = run(oxcPlugin, SOURCE, filename);

  assert.ok(result.map, 'no source map emitted');
  assert.deepEqual(
    await originalLines(result, TOKENS),
    TRUE_LINES,
    'statements after an extracted worklet map to the wrong original lines'
  );
});

test('source map matches the Babel plugin', async () => {
  const filename = path.join(os.tmpdir(), 'worklets-oxc-sourcemap-parity.tsx');
  const babelResult = run(babelPlugin, SOURCE, filename);
  const oxcResult = run(oxcPlugin, SOURCE, filename);

  assert.deepEqual(
    await originalLines(oxcResult, TOKENS),
    await originalLines(babelResult, TOKENS)
  );
});

function precompile(filename) {
  realWriteFileSync(filename, SOURCE);
  try {
    return transformSync(SOURCE, {
      filename,
      babelrc: false,
      configFile: false,
      compact: false,
      sourceMaps: true,
      presets: [
        [
          require.resolve('@babel/preset-typescript'),
          { isTSX: true, allExtensions: true },
        ],
      ],
      plugins: [require.resolve('@babel/plugin-syntax-jsx')],
    });
  } finally {
    fs.unlinkSync(filename);
  }
}

test('source map composes with an input map from an earlier transform', async () => {
  const filename = path.join(os.tmpdir(), 'worklets-oxc-sourcemap-chained.tsx');
  const first = precompile(filename);
  const result = run(oxcPlugin, first.code, filename, {
    inputSourceMap: first.map,
  });

  assert.ok(result.map, 'no source map emitted');
  assert.deepEqual(await originalLines(result, TOKENS), TRUE_LINES);
});
