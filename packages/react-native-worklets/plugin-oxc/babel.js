'use strict';

const path = require('path');

const oxc = require('./index.js');

const MOCK_VERSION = 'x.y.z';

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

const SYNTAX_JSX = require.resolve('@babel/plugin-syntax-jsx');
const SYNTAX_TYPESCRIPT = require.resolve('@babel/plugin-syntax-typescript');

const GENERATED_WORKLETS_DIR = 'react-native-worklets/.worklets';

function reparseSyntaxPlugins(filename) {
  if (filename.endsWith('.tsx')) {
    return [[SYNTAX_TYPESCRIPT, { isTSX: true }]];
  }
  if (/\.(ts|mts|cts)$/.test(filename)) {
    return [[SYNTAX_TYPESCRIPT, { isTSX: false }]];
  }
  return [[SYNTAX_JSX]];
}

const PARSE_ERROR_CODE = 'WORKLETS_ERR_PARSE';

const WORKLET_DIRECTIVE_RE = /(^|[\s;{(])['"]worklet['"]\s*;?/m;

const { hooks, methods } = oxc.workletSourceTokens();

const AUTO_WORKLETIZED_HOOKS_RE = new RegExp(`\\b(${hooks.join('|')})\\s*\\(`);

const AUTO_WORKLETIZED_METHODS_RE = new RegExp(
  `\\.\\s*(${methods.join('|')})\\s*\\(`
);

const WORKLET_PACKAGE_RE =
  /react-native-(gesture-handler|reanimated|worklets)/;

function carriesWorklets(sourceText) {
  return (
    WORKLET_DIRECTIVE_RE.test(sourceText) ||
    AUTO_WORKLETIZED_HOOKS_RE.test(sourceText) ||
    (AUTO_WORKLETIZED_METHODS_RE.test(sourceText) &&
      WORKLET_PACKAGE_RE.test(sourceText))
  );
}

function workletsPluginOxcBabelShim(babelApi, options) {
  if (options && options.bundleMode === false) {
    throw new Error(
      '[Worklets] supports Bundle Mode only. Drop `bundleMode: false`, ' +
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
              if (pkgDir == null) {
                throw new Error(
                  "[Worklets] couldn't find the react-native-worklets package " +
                    "on disk, so the generated worklet files have nowhere to go. " +
                    "Make sure it's installed."
                );
              }
              opts.workletsPackageDir = pkgDir;
            }
            if (opts.envName == null) {
              const envName = state.file.opts.envName;
              if (envName != null) opts.envName = envName;
            }
            result = oxc.transform(sourceText, filename, opts);
          } catch (e) {
            const msg = (e && e.message) || '';
            if (msg.includes(PARSE_ERROR_CODE)) {
              if (carriesWorklets(sourceText)) {
                throw new Error(
                  `[Worklets] ${filename} contains worklets but could not ` +
                    'be parsed, so none of them were compiled.\n' +
                    msg
                );
              }
              return;
            }
            throw e;
          }

          if (!result.changed) {
            return;
          }

          if (result.map && !state.file.inputMap) {
            const map = JSON.parse(result.map);
            const generatorOpts = state.file.opts.generatorOpts;
            if (generatorOpts && generatorOpts.sourceFileName) {
              map.sources = [generatorOpts.sourceFileName];
            }
            state.file.inputMap = { toObject: () => map };
          }

          const parserOpts = state.file.opts.parserOpts || {};
          const newAst = parse(result.code, {
            sourceType:
              parserOpts.sourceType ??
              state.file.opts.sourceType ??
              'unambiguous',
            parserOpts: {
              allowReturnOutsideFunction: parserOpts.allowReturnOutsideFunction,
              allowAwaitOutsideFunction: parserOpts.allowAwaitOutsideFunction,
              allowSuperOutsideMethod: parserOpts.allowSuperOutsideMethod,
              allowUndeclaredExports: parserOpts.allowUndeclaredExports,
            },
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
