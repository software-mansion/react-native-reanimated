export const defaultGlobals = new Set([
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
  '_log',
  '_toString',
  '_scheduleOnJS',
  '_makeShareableClone',
  '_updateDataSynchronously',
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
]);

export let globals: Set<string>;

export function initializeGlobals() {
  globals = new Set(defaultGlobals);
}
