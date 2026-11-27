'use strict';

const path = require('path');

const oxc = require('./index.js');

// Previous steps can pass their output sourcemap
// it needs to be merged with this plugin's one
// to preserve correct mappings
const remapping = require('@jridgewell/remapping');
const {
  GREATEST_LOWER_BOUND,
  LEAST_UPPER_BOUND,
  originalPositionFor,
  TraceMap,
} = require('@jridgewell/trace-mapping');

const GENERATED_WORKLETS_DIR = 'react-native-worklets/.worklets';
const SOURCE_MAP_COMMENT_PREFIX = '# workletSourceMap=';
const ORIGIN_COMMENT_PREFIX = ' __workletOrigin:';
const restoredFiles = new WeakSet();

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
  return {
    name: 'worklets-oxc-plugin',
    pre(file) {
      const filename = file.opts.filename?.replace(/\\/g, '/');
      if (
        filename?.includes(GENERATED_WORKLETS_DIR) &&
        !oxc.isRelease(file.opts.envName)
      ) {
        restoreWorkletFileLocations(file);
      }
    },
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

/** @param {import('@babel/core').BabelFile} file */
function restoreWorkletFileLocations(file) {
  if (restoredFiles.has(file)) {
    return;
  }
  restoredFiles.add(file);

  const comments = file.ast.comments ?? [];
  const sourceMapComment = comments.find((comment) =>
    comment.value.startsWith(SOURCE_MAP_COMMENT_PREFIX)
  );
  if (!sourceMapComment) {
    return;
  }

  const map = new TraceMap(
    Buffer.from(
      sourceMapComment.value.slice(SOURCE_MAP_COMMENT_PREFIX.length),
      'base64'
    ).toString('utf8')
  );
  const lineOffset =
    comments[0]?.value.startsWith(ORIGIN_COMMENT_PREFIX) &&
    comments[0].loc?.start.line === 1
      ? 1
      : 0;

  const toOriginal = (position) => {
    const needle = {
      line: position.line - lineOffset,
      column: position.column,
    };
    const lower = originalPositionFor(map, {
      ...needle,
      bias: GREATEST_LOWER_BOUND,
    });
    const original =
      lower.line !== null
        ? lower
        : originalPositionFor(map, { ...needle, bias: LEAST_UPPER_BOUND });
    if (original.line === null) {
      return null;
    }
    return {
      position: { line: original.line, column: original.column, index: 0 },
      source: original.source,
    };
  };

  let lastStart = null;
  file.path.traverse({
    enter(path) {
      const { loc } = path.node;
      if (!loc) {
        return;
      }
      const start = toOriginal(loc.start) ?? lastStart;
      if (!start) {
        return;
      }
      lastStart = start;
      path.node.loc = {
        ...loc,
        filename: start.source ?? loc.filename,
        start: start.position,
        end: toOriginal(loc.end)?.position ?? start.position,
      };
    },
  });
}

/**
 * @param {string} sourceText
 * @param {string} filename
 * @param {import('@babel/core').PluginPass} state
 * @returns {import('./index').TransformResult}
 */
function transform(sourceText, filename, state) {
  warnAboutIgnoredOptions(state.opts);
  warnAboutDangerousRelativePaths(state.opts);
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
