'use strict';

const path = require('path');

const oxc = require('./index.js');

// Previous steps can pass their output sourcemap
// it needs to be merged with this plugin's one
// to preserve correct mappings
const remapping = require('@jridgewell/remapping');

const PARSE_ERROR_CODE = 'WORKLETS_ERR_PARSE';
const FLOW_ERROR_CODE = 'WORKLETS_ERR_FLOW';

let warnedAboutIgnoredOptions = false;
let cachedWorkletsPkgDir;
let cachedSyntaxJsx;
let cachedSyntaxTypescript;

/**
 * @param {typeof import('@babel/core')} babelApi
 * @returns {import('@babel/core').PluginObj}
 */
function workletsPluginOxcBabelShim(babelApi) {
  const inPlace = !babelApi.caller(isMetroCaller);
  return {
    name: 'worklets-oxc-plugin',
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
              '[Worklets] the Oxc transform needs a filename to name worklets ' +
                'and to place their generated files, but Babel was given none.'
            );
          }

          const result = transform(state.file.code, filename, state, inPlace);
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

/**
 * @param {string} sourceText
 * @param {string} filename
 * @param {import('@babel/core').PluginPass} state
 * @returns {import('./index').TransformResult}
 */
function transform(sourceText, filename, state, inPlace) {
  warnAboutIgnoredOptions(state.opts);
  warnAboutDangerousRelativePaths(state.opts);
  try {
    return oxc.transform(sourceText, filename, {
      ...state.opts,
      envName: state.file.opts.envName,
      workletsPackageDir: inPlace ? undefined : resolveWorkletsPkgDir(),
      inPlace,
      cwd: state.file.opts.cwd ?? process.cwd(),
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

/**
 * @param {{ name?: string; bundler?: string } | undefined} caller
 * @returns {boolean}
 */
function isMetroCaller(caller) {
  return caller?.bundler === 'metro' || caller?.name === 'metro';
}

/**
 * @param {import('./index').PluginOptions} options
 * @returns {void}
 */
function warnAboutIgnoredOptions(options) {
  if (warnedAboutIgnoredOptions) {
    return;
  }
  const hasExtras =
    (options?.extraPlugins?.length ?? 0) > 0 ||
    (options?.extraPresets?.length ?? 0) > 0;
  if (!hasExtras) {
    return;
  }
  warnedAboutIgnoredOptions = true;
  console.warn(
    '[Worklets] `extraPlugins`/`extraPresets` are accepted for option-surface ' +
      'compatibility with `react-native-worklets/plugin` but ignored — the Oxc transform ' +
      'cannot dispatch arbitrary Babel plugins. Compose them around this plugin in ' +
      'babel.config.js instead.'
  );
}

const COMMON_FOLDER_NAMES = new Set([
  'app',
  'build',
  'cjs',
  'common',
  'commonjs',
  'components',
  'core',
  'dist',
  'esm',
  'helpers',
  'lib',
  'module',
  'modules',
  'shared',
  'source',
  'src',
  'utils',
]);

const warnedDangerousPaths = new Set();

/**
 * @param {import('./index').PluginOptions} options
 * @returns {void}
 */
function warnAboutDangerousRelativePaths(options) {
  const relativePaths = options?.importForwarding?.relativePaths;
  if (options?.silenceDangerousPathsWarning || !relativePaths) {
    return;
  }
  for (const relativePath of relativePaths) {
    if (
      typeof relativePath !== 'string' ||
      warnedDangerousPaths.has(relativePath) ||
      !isDangerousRelativePath(relativePath)
    ) {
      continue;
    }
    warnedDangerousPaths.add(relativePath);
    console.warn(getDangerousRelativePathWarning(relativePath));
  }
}

/**
 * @param {string} relativePath
 * @returns {boolean}
 */
function isDangerousRelativePath(relativePath) {
  const segments = relativePath.split('/');
  return (
    relativePath.length > 0 &&
    segments.every((segment) => COMMON_FOLDER_NAMES.has(segment))
  );
}

/**
 * @param {string} relativePath
 * @returns {string}
 */
function getDangerousRelativePathWarning(relativePath) {
  return (
    `[Worklets] \`importForwarding.relativePaths\` contains '${relativePath}', which has only common folder names. ` +
    `It can also match folders inside packages in node_modules, for example 'node_modules/<package>/${relativePath}', ` +
    `and the relative imports inside their worklets get forwarded too, which can crash the app. ` +
    `Use a path that only your code has. ` +
    `Set the \`silenceDangerousPathsWarning\` plugin option to \`true\` to hide this warning. ` +
    `See https://docs.swmansion.com/react-native-worklets/docs/worklets-plugin/plugin-options/#importforwardingrelativepaths`
  );
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

/**
 * @param {import('./index').TransformResult} result
 * @param {import('@babel/core').PluginPass} state
 * @returns {void}
 */
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

/**
 * @param {typeof import('@babel/core')} babelApi
 * @param {string} code
 * @param {string} filename
 * @param {import('@babel/core').PluginPass} state
 * @returns {import('@babel/types').Program}
 */
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

/**
 * @param {string} filename
 * @returns {import('@babel/core').PluginItem[]}
 */
function reparseSyntaxPlugins(filename) {
  if (filename.endsWith('.tsx')) {
    return [[syntaxTypescript(), { isTSX: true }]];
  }
  if (/\.(ts|mts|cts)$/.test(filename)) {
    return [[syntaxTypescript(), { isTSX: false }]];
  }
  return [[syntaxJsx()]];
}

/** @returns {string} */
function syntaxTypescript() {
  cachedSyntaxTypescript ??= require.resolve('@babel/plugin-syntax-typescript');
  return cachedSyntaxTypescript;
}

/** @returns {string} */
function syntaxJsx() {
  cachedSyntaxJsx ??= require.resolve('@babel/plugin-syntax-jsx');
  return cachedSyntaxJsx;
}

module.exports = workletsPluginOxcBabelShim;
module.exports.default = workletsPluginOxcBabelShim;
