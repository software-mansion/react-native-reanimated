'use strict';

/**
 * Babel plugin shim around the OXC-native worklets transform.
 *
 * When invoked as a Babel plugin (e.g. inside Metro), this:
 *   1. Calls the native OXC `transform()` on the file's source text
 *   2. Writes any bundle-mode `react-native-worklets/.worklets/<hash>.js`
 *      files the transform asked us to emit
 *   3. Parses the OXC output back into a Babel AST
 *   4. Replaces the current Program with the new AST so downstream Babel
 *      plugins / generators see the workletized code
 *
 * The shim runs once per file on `Program.enter`. After replacement we mark
 * the file so a second pass (e.g. from a different preset that re-includes
 * the same plugin) is a no-op.
 */

const fs = require('fs');
const path = require('path');

const oxc = require('./index.js');

// Sniff the real `react-native-worklets` version once per Node process so we
// can stamp it onto every workletized function as `__pluginVersion`. The
// runtime compares this with its own version at startup and refuses code
// stamped by a mismatched plugin build. Resolves to `null` (left to the
// Rust fallback) if the package isn't installed.
let cachedPluginVersion = undefined;
function getPluginVersion() {
  if (cachedPluginVersion !== undefined) return cachedPluginVersion;
  try {
    cachedPluginVersion = require('react-native-worklets/package.json').version;
  } catch {
    cachedPluginVersion = null;
  }
  return cachedPluginVersion;
}

// Resolve `react-native-worklets/.worklets/` to an absolute filesystem
// directory once per Node process. The Rust transform returns module-style
// paths (`react-native-worklets/.worklets/<hash>.js`) which the worklet
// runtime resolves via `require()`; here on the build host we need a real
// filesystem location to write to.
let cachedWorkletsPkgDir = null;
function resolveWorkletsPkgDir() {
  if (cachedWorkletsPkgDir !== null) return cachedWorkletsPkgDir;
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

function writeEmittedFiles(files) {
  if (!files || files.length === 0) return;
  const dir = resolveWorkletsDir();
  if (!dir) {
    throw new Error(
      "[worklets-plugin-oxc] bundleMode emitted files but couldn't find " +
        "the react-native-worklets package on disk. Make sure it's installed."
    );
  }
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {
    /* writeFileSync below will surface a clearer error if creation truly failed */
  }
  for (const file of files) {
    let absPath;
    if (file.path.startsWith(WORKLETS_PREFIX)) {
      absPath = path.join(dir, file.path.slice(WORKLETS_PREFIX.length));
    } else {
      // Unknown shape — fall back to writing it literally inside .worklets/
      absPath = path.join(dir, path.basename(file.path));
    }
    fs.writeFileSync(absPath, file.content);
  }
}

// Quick reject: files with no plausible worklet content can skip the OXC
// roundtrip entirely. Anything that uses worklets has one of these tokens
// somewhere in the source text.
const WORKLET_TOKENS = [
  "'worklet'",
  '"worklet"',
  '__workletClass',
  'useAnimatedStyle',
  'useAnimatedProps',
  'useDerivedValue',
  'useFrameCallback',
  'useAnimatedScrollHandler',
  'useAnimatedReaction',
  'createAnimatedPropAdapter',
  'runOnUI',
  'executeOnUIRuntimeSync',
  'scheduleOnUI',
  'runOnUISync',
  'runOnUIAsync',
  'runOnRuntime',
  'runOnRuntimeSync',
  'runOnRuntimeAsync',
  'scheduleOnRuntime',
  'withTiming',
  'withSpring',
  'withDecay',
  'withRepeat',
  'Gesture.',
  '.withCallback',
];

function mightContainWorklets(sourceText) {
  for (const t of WORKLET_TOKENS) {
    if (sourceText.indexOf(t) !== -1) return true;
  }
  return false;
}

function workletsPluginOxcBabelShim(babelApi) {
  const { parse } = babelApi || require('@babel/core');

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

          // Cheap pre-filter: skip files that obviously contain no worklet
          // hooks/directives. Avoids OXC parsing Flow / weird syntax in
          // dependencies that have nothing for us to do anyway.
          if (!mightContainWorklets(sourceText)) {
            return;
          }

          let result;
          try {
            // Merge in the sniffed version so the user doesn't have to set
            // it in babel.config.js. Their explicit value wins if provided.
            const opts = { ...(state.opts || {}) };
            if (opts.pluginVersion == null) {
              const v = getPluginVersion();
              if (v != null) opts.pluginVersion = v;
            }
            // Hand the resolved worklets package dir to the native layer so
            // bundle-mode require rewriting can compute correct relative
            // paths from <pkg>/.worklets/<hash>.js to the source file.
            if (opts.workletsPackageDir == null) {
              const pkgDir = resolveWorkletsPkgDir();
              if (pkgDir != null) opts.workletsPackageDir = pkgDir;
            }
            // Hand over Babel's cwd so `relativeSourceLocation` can rewrite
            // `__initData.location` and the embedded source map's `sources`
            // entry to a project-relative path.
            if (opts.cwd == null) {
              opts.cwd = state.cwd || (state.file && state.file.opts && state.file.opts.cwd) || process.cwd();
            }
            result = oxc.transform(sourceText, filename, opts);
          } catch (e) {
            // If OXC fails to parse the file (Flow, exotic syntax, etc.),
            // fall through and leave the AST untouched. If the file actually
            // contained worklets, they won't be transformed — but the
            // pre-filter already screens out most such cases, and surfacing
            // the error would break unrelated dependencies.
            return;
          }

          // Side effect: bundle-mode file emission. Done BEFORE replacing the
          // AST so that if writing fails we don't leave a partially-mutated
          // file on disk + transformed program in memory mismatched.
          writeEmittedFiles(result.files);

          const newAst = parse(result.code, {
            sourceType: 'module',
            babelrc: false,
            configFile: false,
            plugins: [
              ['@babel/plugin-syntax-jsx'],
              [
                '@babel/plugin-syntax-typescript',
                { isTSX: filename.endsWith('.tsx') },
              ],
            ],
          });

          programPath.replaceWith(newAst.program);
          // Note: do NOT call `programPath.stop()` here — other plugins in
          // the babel chain (e.g. `module-resolver` for path aliases) still
          // need to traverse the rewritten program. The `__workletsOxcRan`
          // flag above prevents us from re-entering this visitor on the
          // freshly replaced node.
        },
      },
    },
  };
}

module.exports = workletsPluginOxcBabelShim;
module.exports.default = workletsPluginOxcBabelShim;
