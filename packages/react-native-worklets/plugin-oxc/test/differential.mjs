import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const pluginDir = path.join(here, '..', '..', 'plugin');
const require = createRequire(path.join(pluginDir, 'package.json'));

const { transformSync } = require('@babel/core');
const babelPlugin = require(path.join(pluginDir, 'index.js'));
const oxcShim = require(path.join(here, '..', 'babel.js'));
const {
  normalizeSnapshot,
  resetWorkletHashIds,
} = require(path.join(pluginDir, 'jest', 'workletHashSerializer.js'));

const SYNTAX_JSX = require.resolve('@babel/plugin-syntax-jsx');
const PRESET_TYPESCRIPT = require.resolve('@babel/preset-typescript');

export const EMITTED_MARKER = '/* --- emitted --- */';

const PLUGIN_OPTIONS = {
  bundleMode: true,
  disableSourceMaps: true,
  relativeSourceLocation: true,
};

function run(plugin, source, filename, pluginOptions) {
  const emitted = [];
  const realWriteFileSync = fs.writeFileSync;
  fs.writeFileSync = (_, content) => emitted.push(String(content));
  resetWorkletHashIds();
  try {
    const { code } = transformSync(source, {
      filename,
      compact: false,
      babelrc: false,
      configFile: false,
      presets: [
        [PRESET_TYPESCRIPT, { isTSX: filename.endsWith('x'), allExtensions: true }],
      ],
      plugins: [
        SYNTAX_JSX,
        [plugin, { ...PLUGIN_OPTIONS, ...pluginOptions }],
      ],
    });
    return [code, ...emitted].map(normalize).join(`\n${EMITTED_MARKER}\n`);
  } catch (error) {
    return `ERROR: ${error.message.split('\n')[0]}`;
  } finally {
    fs.writeFileSync = realWriteFileSync;
  }
}

function normalize(code) {
  return normalizeSnapshot(code)
    .replace(/(^|\n)(\s*)'([^'\n]*)';/g, '$1$2"$3";')
    .replace(/\n{2,}/g, '\n')
    .replace(/(\W)([A-Za-z_$][\w$]*): \2(\W)/g, '$1$2$3');
}

export function compare(source, filename = 'test.ts', pluginOptions = {}) {
  const babel = run(babelPlugin.default ?? babelPlugin, source, filename, pluginOptions);
  const oxc = run(oxcShim, source, filename, pluginOptions);
  return { equal: babel === oxc, babel, oxc };
}

export function compareEmitted(source, filename = 'test.ts', pluginOptions = {}) {
  const { babel, oxc } = compare(source, filename, pluginOptions);
  const emittedOnly = (output) =>
    output.split(EMITTED_MARKER).slice(1).join(EMITTED_MARKER);
  return { equal: emittedOnly(babel) === emittedOnly(oxc), babel, oxc };
}

export function assertParity(assert, source, filename, pluginOptions) {
  const { equal, babel, oxc } = compare(source, filename, pluginOptions);
  assert.ok(
    equal,
    `Output differs for:\n${source}\n--- babel ---\n${babel}\n--- oxc ---\n${oxc}`
  );
}
