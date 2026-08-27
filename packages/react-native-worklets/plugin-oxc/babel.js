'use strict';

const path = require('path');

const oxc = require('./index.js');
const remapping = require('@jridgewell/remapping');

const PARSE_ERROR_CODE = 'WORKLETS_ERR_PARSE';
const FLOW_ERROR_CODE = 'WORKLETS_ERR_FLOW';

const SYNTAX_JSX = require.resolve('@babel/plugin-syntax-jsx');
const SYNTAX_TYPESCRIPT = require.resolve('@babel/plugin-syntax-typescript');

let cachedWorkletsPkgDir;

/**
 * @param {typeof import('@babel/core')} babelApi
 * @param {import('./index').PluginOptions} options
 * @returns {import('@babel/core').PluginObj}
 */
function workletsPluginOxcBabelShim(babelApi, options) {
  if (options && options.bundleMode === false) {
    throw new Error(
      '[Worklets] supports Bundle Mode only. Drop `bundleMode: false`, ' +
        'or use `react-native-worklets/plugin` for the legacy pipeline.'
    );
  }

  return {
    name: 'worklets-plugin-oxc',
    visitor: {
      Program: {
        enter(programPath, state) {
          if (state.file.__workletsOxcRan) {
            return;
          }
          state.file.__workletsOxcRan = true;

          const filename = state.filename;
          if (filename == null) {
            throw new Error(
              '[Worklets] the OXC transform needs a filename to name worklets ' +
                'and to place their generated files, but Babel was given none.'
            );
          }

          const result = transform(state.file.code, filename, state);
          if (!result.changed) {
            return;
          }

          adoptSourceMap(result, state);
          programPath.replaceWith(
            reparse(babelApi, result.code, filename, state)
          );
        },
      },
    },
  };
}

/** @returns {import('./index').TransformResult} */
function transform(sourceText, filename, state) {
  try {
    return oxc.transform(sourceText, filename, {
      ...state.opts,
      envName: state.file.opts.envName,
      workletsPackageDir: resolveWorkletsPkgDir(),
    });
  } catch (error) {
    const message = (error && error.message) || '';
    if (message.includes(FLOW_ERROR_CODE)) {
      return { code: sourceText, files: [], changed: false };
    }
    if (message.includes(PARSE_ERROR_CODE)) {
      throw new Error(
        `[Worklets] ${filename} could not be parsed, so no worklets in it ` +
          `were compiled.\n${message}`
      );
    }
    throw error;
  }
}

/** @returns {import('@babel/types').Program} */
function reparse(babelApi, code, filename, state) {
  const parse = (babelApi && babelApi.parse) || require('@babel/core').parse;
  const parserOpts = state.file.opts.parserOpts ?? {};
  const ast = parse(code, {
    sourceType:
      parserOpts.sourceType ?? state.file.opts.sourceType ?? 'unambiguous',
    parserOpts: { ...parserOpts },
    babelrc: false,
    configFile: false,
    plugins: reparseSyntaxPlugins(filename),
  });
  return ast.program;
}

function reparseSyntaxPlugins(filename) {
  if (filename.endsWith('.tsx')) {
    return [[SYNTAX_TYPESCRIPT, { isTSX: true }]];
  }
  if (/\.(ts|mts|cts)$/.test(filename)) {
    return [[SYNTAX_TYPESCRIPT, { isTSX: false }]];
  }
  return [[SYNTAX_JSX]];
}

function adoptSourceMap(result, state) {
  if (!result.map) {
    return;
  }
  const map = JSON.parse(result.map);
  const sourceFileName = state.file.opts.generatorOpts?.sourceFileName;
  if (sourceFileName) {
    map.sources = [sourceFileName];
  }
  const previous = state.file.inputMap;
  if (previous) {
    const previousMap = previous.toObject();
    const composed = remapping([map, previousMap], () => null, true);
    state.file.inputMap = { toObject: () => composed };
    return;
  }
  state.file.inputMap = { toObject: () => map };
}

/** @returns {string} */
function resolveWorkletsPkgDir() {
  if (cachedWorkletsPkgDir === undefined) {
    try {
      cachedWorkletsPkgDir = path.dirname(
        require.resolve('react-native-worklets/package.json')
      );
    } catch (error) {
      throw new Error(
        "[Worklets] couldn't find the react-native-worklets package on disk, " +
          'so the generated worklet files have nowhere to go. ' +
          `Make sure it's installed. Cause: ${error.message}`
      );
    }
  }
  return cachedWorkletsPkgDir;
}

module.exports = workletsPluginOxcBabelShim;
module.exports.default = workletsPluginOxcBabelShim;
