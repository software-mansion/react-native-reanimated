'use strict';

const fs = require('fs');
const path = require('path');

const oxc = require('./index.js');

let cachedPluginVersion = undefined;
function getPluginVersion() {
  if (process.env.WORKLETS_JEST_SHOULD_MOCK_VERSION === '1') {
    return MOCK_VERSION;
  }
  if (cachedPluginVersion !== undefined) return cachedPluginVersion;
  try {
    cachedPluginVersion = require('react-native-worklets/package.json').version;
  } catch {
    cachedPluginVersion = null;
  }
  return cachedPluginVersion;
}

const MOCK_VERSION = 'x.y.z';

let cachedWorkletsPkgDir = undefined;
function resolveWorkletsPkgDir() {
  if (cachedWorkletsPkgDir !== undefined) return cachedWorkletsPkgDir;
  try {
    const pkgJsonPath = require.resolve('react-native-worklets/package.json');
    cachedWorkletsPkgDir = path.dirname(pkgJsonPath);
  } catch {
    cachedWorkletsPkgDir = null;
  }
  return cachedWorkletsPkgDir;
}
function resolveWorkletsDir() {
  const pkg = resolveWorkletsPkgDir();
  return pkg ? path.join(pkg, '.worklets') : null;
}

const WORKLETS_PREFIX = 'react-native-worklets/.worklets/';

const SYNTAX_JSX = require.resolve('@babel/plugin-syntax-jsx');
const SYNTAX_TYPESCRIPT = require.resolve('@babel/plugin-syntax-typescript');

function writeEmittedFiles(files) {
  if (!files || files.length === 0) return;
  const dir = resolveWorkletsDir();
  if (!dir) {
    throw new Error(
      "[worklets-plugin-oxc] emitted bundle files but couldn't find " +
        "the react-native-worklets package on disk. Make sure it's installed."
    );
  }
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {
      }
  for (const file of files) {
    let absPath;
    if (file.path.startsWith(WORKLETS_PREFIX)) {
      absPath = path.join(dir, file.path.slice(WORKLETS_PREFIX.length));
    } else {
      absPath = path.join(dir, path.basename(file.path));
    }
    fs.writeFileSync(absPath, file.content);
  }
}

// `@babel/plugin-syntax-typescript` with `isTSX: false` turns JSX parsing
// off, so pairing it with syntax-jsx breaks any non-`.tsx` file containing
// JSX — including the `.js` worklet files this plugin emits itself.
function reparseSyntaxPlugins(filename) {
  if (filename.endsWith('.tsx')) {
    return [[SYNTAX_TYPESCRIPT, { isTSX: true }]];
  }
  if (/\.(ts|mts|cts)$/.test(filename)) {
    return [[SYNTAX_TYPESCRIPT, { isTSX: false }]];
  }
  return [[SYNTAX_JSX]];
}

const GENERATED_WORKLETS_DIR = 'react-native-worklets/.worklets';

// Must match the constant the native transform prefixes parse failures with.
const PARSE_ERROR_CODE = 'WORKLETS_ERR_PARSE';

function workletsPluginOxcBabelShim(babelApi, options) {
  if (options && options.bundleMode === false) {
    throw new Error(
      '[worklets-plugin-oxc] supports Bundle Mode only. Drop `bundleMode: false`, ' +
        'or use `react-native-worklets/plugin` for the legacy pipeline.'
    );
  }

  const parse = (babelApi && babelApi.parse) || require('@babel/core').parse;

  return {
    name: 'worklets-plugin-oxc',
    visitor: {
      Program: {
        enter(programPath, state) {
          if (state.file.__workletsOxcRan) return;
          state.file.__workletsOxcRan = true;

          const sourceText = state.file.code;
          const filename =
            state.filename || state.file.opts.filename || 'unknown.js';

          // Files this plugin emitted already hold finished factories.
          if (filename.replace(/\\/g, '/').includes(GENERATED_WORKLETS_DIR)) {
            return;
          }

          let result;
          try {
            const opts = { ...(state.opts || {}) };
            if (opts.pluginVersion == null) {
              const v = getPluginVersion();
              if (v != null) opts.pluginVersion = v;
            }
            if (opts.workletsPackageDir == null) {
              const pkgDir = resolveWorkletsPkgDir();
              if (pkgDir != null) opts.workletsPackageDir = pkgDir;
            }
            if (opts.envName == null) {
              const envName = state.file.opts.envName;
              if (envName != null) opts.envName = envName;
            }
            result = oxc.transform(sourceText, filename, opts);
          } catch (e) {
            const msg = (e && e.message) || '';
            if (msg.includes(PARSE_ERROR_CODE)) {
              return;
            }
            throw e;
          }

          writeEmittedFiles(result.files);

          const newAst = parse(result.code, {
            sourceType: 'module',
            babelrc: false,
            configFile: false,
            plugins: reparseSyntaxPlugins(filename),
          });

          programPath.replaceWith(newAst.program);
        },
      },
    },
  };
}

module.exports = workletsPluginOxcBabelShim;
module.exports.default = workletsPluginOxcBabelShim;
