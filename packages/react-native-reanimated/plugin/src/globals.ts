import type { ReanimatedPluginPass } from './types';

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
  'console',
  'performance',
  'queueMicrotask',
  'requestAnimationFrame',
  'setImmediate',
  'arguments', // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/arguments

  // Hermes
  'HermesInternal',

  // Reanimated
  '_WORKLET',
  'ReanimatedError',
  '__reanimatedLoggerConfig',
];

/**
 * @deprecated Since we moved on to using `global.` prefix in Reanimated, we
 *   don't need to capture these identifiers anymore. However, for safety
 *   reasons and 3rd party libraries, we still keep them in the list.
 *
 *   `_WORKLET` is the only exception since it's a part of the public API.
 */
// eslint-disable-next-line camelcase
const notCapturedIdentifiers_DEPRECATED = [
  // Reanimated
  '_IS_FABRIC',
  '_log',
  '_toString',
  '_scheduleHostFunctionOnJS',
  '_scheduleRemoteFunctionOnJS',
  '_scheduleOnRuntime',
  '_makeShareableClone',
  '_updatePropsPaper',
  '_updatePropsFabric',
  '_removeFromPropsRegistry',
  '_measurePaper',
  '_measureFabric',
  '_scrollToPaper',
  '_dispatchCommandPaper',
  '_dispatchCommandFabric',
  '_setGestureState',
  '_notifyAboutProgress',
  '_notifyAboutEnd',
  '_runOnUIQueue',
  '_getAnimationTimestamp',
];

export function initializeState(state: ReanimatedPluginPass) {
  state.workletNumber = 1;
  state.classesToWorkletize = [];
  initializeGlobals();
  addCustomGlobals(state);
}

export const defaultGlobals = new Set(
  notCapturedIdentifiers.concat(notCapturedIdentifiers_DEPRECATED)
);

export let globals: Set<string>;

export function initializeGlobals() {
  globals = new Set(defaultGlobals);
}

/**
 * This function allows to add custom globals such as host-functions. Those
 * globals have to be passed as an argument for the plugin in babel.config.js.
 *
 * For example:
 *
 * ```js
 * plugins: [
 *   ['react-native-reanimated/plugin', { globals: ['myHostFunction'] }],
 * ];
 * ```
 */
export function addCustomGlobals(state: ReanimatedPluginPass) {
  if (state.opts && Array.isArray(state.opts.globals)) {
    state.opts.globals.forEach((name: string) => {
      globals.add(name);
    });
  }
}
