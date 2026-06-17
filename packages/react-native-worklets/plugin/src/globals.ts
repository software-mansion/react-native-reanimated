import type { NodePath } from '@babel/core';
import type { CallExpression } from '@babel/types';
import path from 'path';

import { processCalleesAutoworkletizableCallbacks } from './autoworkletization';
import { generatedWorkletsDir, type WorkletsPluginPass } from './types';

const notCapturedIdentifiers = [
  // Based on https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects

  // Note that objects' properties don't need to be listed since we always only capture the whole object,
  // e.g. `global.__ErrorUtils` or `Intl.DateTimeFormat`.

  // Value properties
  'globalThis',
  'Infinity',
  'NaN',
  'undefined',

  // Function properties
  'eval',
  'isFinite',
  'isNaN',
  'parseFloat',
  'parseInt',
  'decodeURI',
  'decodeURIComponent',
  'encodeURI',
  'encodeURIComponent',
  'escape',
  'unescape',

  // Fundamental objects
  'Object',
  'Function',
  'Boolean',
  'Symbol',

  // Error objects
  'Error',
  'AggregateError',
  'EvalError',
  'RangeError',
  'ReferenceError',
  'SyntaxError',
  'TypeError',
  'URIError',
  'InternalError',

  // Numbers and dates
  'Number',
  'BigInt',
  'Math',
  'Date',

  // Text processing
  'String',
  'RegExp',

  // Indexed collections
  'Array',
  'Int8Array',
  'Uint8Array',
  'Uint8ClampedArray',
  'Int16Array',
  'Uint16Array',
  'Int32Array',
  'Uint32Array',
  'BigInt64Array',
  'BigUint64Array',
  'Float32Array',
  'Float64Array',

  // Keyed collections
  'Map',
  'Set',
  'WeakMap',
  'WeakSet',

  // Structured data
  'ArrayBuffer',
  'SharedArrayBuffer',
  'DataView',
  'Atomics',
  'JSON',

  // Managing memory
  'WeakRef',
  'FinalizationRegistry',

  // Control abstraction objects
  'Iterator',
  'AsyncIterator',
  'Promise',
  'GeneratorFunction',
  'AsyncGeneratorFunction',
  'Generator',
  'AsyncGenerator',
  'AsyncFunction',

  // Reflection
  'Reflect',
  'Proxy',

  // Internationalization
  'Intl',

  // Other stuff
  'null',
  'this',
  'global',
  'window',
  'globalThis',
  'self',
  'console',
  'performance',
  'arguments', // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/arguments
  'require',
  'fetch',
  'XMLHttpRequest',
  'WebSocket',

  // Run loop
  'queueMicrotask',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'setTimeout',
  'clearTimeout',
  'setImmediate',
  'clearImmediate',
  'setInterval',
  'clearInterval',

  // Hermes
  'HermesInternal',

  // Worklets
  '_WORKLET',
];

export function initializeState(state: WorkletsPluginPass) {
  state.skipFile = isGeneratedWorkletFile(state.file.opts.filename);
  if (state.skipFile) {
    return;
  }
  state.workletNumber = 1;
  state.classesToWorkletize = [];
  state.autoworkletizationPlugin = {
    name: 'worklets-autoworkletization',
    visitor: {
      CallExpression: {
        enter(nodePath: NodePath<CallExpression>) {
          processCalleesAutoworkletizableCallbacks(nodePath, state);
        },
      },
    },
  };
  if (!state.opts.strictGlobal) {
    initializeGlobals();
    addCustomGlobals(state);
  }

  const userImportForwarding = state.opts.importForwarding;
  state.opts.importForwarding = {
    relativePaths: [
      ...defaultAllowedPaths,
      ...(userImportForwarding?.relativePaths ?? []),
    ],
    moduleNames: [
      ...defaultAllowedModules,
      ...(userImportForwarding?.moduleNames ?? []),
    ],
  };
}

export function isGeneratedWorkletFile(
  filename: string | undefined | null
): boolean {
  if (!filename) {
    return false;
  }
  const generatedWorkletsDirPath = path.join(
    'react-native-worklets',
    generatedWorkletsDir
  );
  return filename.includes(generatedWorkletsDirPath);
}

export const defaultGlobals = new Set(notCapturedIdentifiers);

export let globals: Set<string>;

export function initializeGlobals() {
  globals = new Set(defaultGlobals);
}

const defaultAllowedPaths = ['react-native-worklets'];
const defaultAllowedModules = [
  'react-native-worklets',
  'react-native/Libraries/Core/setUpXHR',
];

/**
 * This function allows to add custom globals such as host-functions. Those
 * globals have to be passed as an argument for the plugin in babel.config.js.
 *
 * For example:
 *
 * ```js
 * plugins: [
 *   ['react-native-worklets/plugin', { globals: ['myHostFunction'] }],
 * ];
 * ```
 */
export function addCustomGlobals(state: WorkletsPluginPass) {
  if (state.opts && Array.isArray(state.opts.globals)) {
    state.opts.globals.forEach((name: string) => {
      globals.add(name);
    });
  }
}
