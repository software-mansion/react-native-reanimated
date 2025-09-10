'use strict';

import { registerWorkletStackDetails } from "./errors.js";
import { isSynchronizable } from "./isSynchronizable.js";
import { logger } from "./logger.js";
import { SHOULD_BE_USE_WEB } from "./PlatformChecker/index.js";
import { serializableMappingCache, serializableMappingFlag } from "./serializableMappingCache.js";
import { jsVersion } from "./utils/jsVersion.js";
import { isWorkletFunction } from "./workletFunction.js";
import { WorkletsError } from "./WorkletsError.js";
import { WorkletsModule } from "./WorkletsModule/index.js";
// for web and jest environments this file provides a stub implementation
// where no serializable references are used. Instead, the objects themselves are used
// instead of serializable references, because of the fact that we don't have to deal with
// running the code on separate VMs.

const MAGIC_KEY = 'REANIMATED_MAGIC_KEY';
function isHostObject(value) {
  'worklet';

  // We could use JSI to determine whether an object is a host object, however
  // the below workaround works well and is way faster than an additional JSI call.
  // We use the fact that host objects have broken implementation of `hasOwnProperty`
  // and hence return true for all `in` checks regardless of the key we ask for.
  return MAGIC_KEY in value;
}
export function isSerializableRef(value) {
  return typeof value === 'object' && value !== null && '__serializableRef' in value;
}
function isPlainJSObject(object) {
  'worklet';

  return Object.getPrototypeOf(object) === Object.prototype;
}
function isTurboModuleLike(object) {
  return isHostObject(Object.getPrototypeOf(object));
}
function getFromCache(value) {
  const cached = serializableMappingCache.get(value);
  if (cached === serializableMappingFlag) {
    // This means that `value` was already a clone and we should return it as is.
    return value;
  }
  return cached;
}

// The below object is used as a replacement for objects that cannot be transferred
// as serializable values. In createSerializable we detect if an object is of
// a plain Object.prototype and only allow such objects to be transferred. This lets
// us avoid all sorts of react internals from leaking into the UI runtime. To make it
// possible to catch errors when someone actually tries to access such object on the UI
// runtime, we use the below Proxy object which is instantiated on the UI runtime and
// throws whenever someone tries to access its fields.
const INACCESSIBLE_OBJECT = {
  __init: () => {
    'worklet';

    return new Proxy({}, {
      get: (_, prop) => {
        if (prop === '_isReanimatedSharedValue' || prop === '__remoteFunction') {
          // not very happy about this check here, but we need to allow for
          // "inaccessible" objects to be tested with isSerializableRef check
          // as it is being used in the mappers when extracting inputs recursively
          // as well as with isRemoteFunction when cloning objects recursively.
          // Apparently we can't check if a key exists there as HostObjects always
          // return true for such tests, so the only possibility for us is to
          // actually access that key and see if it is set to true. We therefore
          // need to allow for this key to be accessed here.
          return false;
        }
        throw new WorkletsError(`Trying to access property \`${String(prop)}\` of an object which cannot be sent to the UI runtime.`);
      },
      set: () => {
        throw new WorkletsError('Trying to write to an object which cannot be sent to the UI runtime.');
      }
    });
  }
};
const VALID_ARRAY_VIEWS_NAMES = ['Int8Array', 'Uint8Array', 'Uint8ClampedArray', 'Int16Array', 'Uint16Array', 'Int32Array', 'Uint32Array', 'Float32Array', 'Float64Array', 'BigInt64Array', 'BigUint64Array', 'DataView'];
const DETECT_CYCLIC_OBJECT_DEPTH_THRESHOLD = 30;
// Below variable stores object that we process in createSerializable at the specified depth.
// We use it to check if later on the function reenters with the same object
let processedObjectAtThresholdDepth;
function createSerializableWeb(value) {
  return value;
}
function createSerializableNative(value, shouldPersistRemote = false, depth = 0) {
  detectCyclicObject(value, depth);
  const isObject = typeof value === 'object';
  const isFunction = typeof value === 'function';
  if (typeof value === 'string') {
    return cloneString(value);
  }
  if (typeof value === 'number') {
    return cloneNumber(value);
  }
  if (typeof value === 'boolean') {
    return cloneBoolean(value);
  }
  if (typeof value === 'bigint') {
    return cloneBigInt(value);
  }
  if (value === undefined) {
    return cloneUndefined();
  }
  if (value === null) {
    return cloneNull();
  }
  if (!isObject && !isFunction || value === null) {
    return clonePrimitive(value, shouldPersistRemote);
  }
  const cached = getFromCache(value);
  if (cached !== undefined) {
    return cached;
  }
  if (Array.isArray(value)) {
    return cloneArray(value, shouldPersistRemote, depth);
  }
  if (globalThis._WORKLETS_BUNDLE_MODE && isFunction && value.__bundleData) {
    return cloneImport(value);
  }
  if (isFunction && !isWorkletFunction(value)) {
    return cloneRemoteFunction(value);
  }
  // RN has introduced a new representation of TurboModules as a JS object whose prototype is the host object
  // More details: https://github.com/facebook/react-native/blob/main/packages/react-native/ReactCommon/react/nativemodule/core/ReactCommon/TurboModuleBinding.cpp#L182
  if (isTurboModuleLike(value)) {
    return cloneTurboModuleLike(value, shouldPersistRemote, depth);
  }
  if (isHostObject(value)) {
    return cloneHostObject(value);
  }
  if (isPlainJSObject(value) && value.__init) {
    return cloneInitializer(value, shouldPersistRemote, depth);
  }
  if (isPlainJSObject(value) && value.__workletContextObjectFactory) {
    return cloneContextObject(value);
  }
  if ((isPlainJSObject(value) || isFunction) && isWorkletFunction(value)) {
    return cloneWorklet(value, shouldPersistRemote, depth);
  }
  if (isSynchronizable(value)) {
    return cloneSynchronizable(value);
  }
  if (isPlainJSObject(value) || isFunction) {
    return clonePlainJSObject(value, shouldPersistRemote, depth);
  }
  if (value instanceof Set) {
    return cloneSet(value);
  }
  if (value instanceof Map) {
    return cloneMap(value);
  }
  if (value instanceof RegExp) {
    return cloneRegExp(value);
  }
  if (value instanceof Error) {
    return cloneError(value);
  }
  if (value instanceof ArrayBuffer) {
    return cloneArrayBuffer(value, shouldPersistRemote);
  }
  if (ArrayBuffer.isView(value)) {
    // typed array (e.g. Int32Array, Uint8ClampedArray) or DataView
    return cloneArrayBufferView(value);
  }
  return inaccessibleObject(value);
}
if (globalThis._WORKLETS_BUNDLE_MODE) {
  // TODO: Do it programatically.
  createSerializableNative.__bundleData = {
    imported: 'createSerializable',
    // @ts-expect-error resolveWeak is defined by Metro
    source: require.resolveWeak('./index')
  };
}
export const createSerializable = SHOULD_BE_USE_WEB ? createSerializableWeb : createSerializableNative;
function detectCyclicObject(value, depth) {
  if (depth >= DETECT_CYCLIC_OBJECT_DEPTH_THRESHOLD) {
    // if we reach certain recursion depth we suspect that we are dealing with a cyclic object.
    // this type of objects are not supported and cannot be transferred as serializable, so we
    // implement a simple detection mechanism that remembers the value at a given depth and
    // tests whether we try reenter this method later on with the same value. If that happens
    // we throw an appropriate error.
    if (depth === DETECT_CYCLIC_OBJECT_DEPTH_THRESHOLD) {
      processedObjectAtThresholdDepth = value;
    } else if (value === processedObjectAtThresholdDepth) {
      throw new WorkletsError('Trying to convert a cyclic object to a serializable. This is not supported.');
    }
  } else {
    processedObjectAtThresholdDepth = undefined;
  }
}
function clonePrimitive(value, shouldPersistRemote) {
  return WorkletsModule.createSerializable(value, shouldPersistRemote);
}
function cloneString(value) {
  return WorkletsModule.createSerializableString(value);
}
function cloneNumber(value) {
  return WorkletsModule.createSerializableNumber(value);
}
function cloneBoolean(value) {
  return WorkletsModule.createSerializableBoolean(value);
}
function cloneBigInt(value) {
  return WorkletsModule.createSerializableBigInt(value);
}
function cloneUndefined() {
  return WorkletsModule.createSerializableUndefined();
}
function cloneNull() {
  return WorkletsModule.createSerializableNull();
}
function cloneObjectProperties(value, shouldPersistRemote, depth) {
  const clonedProps = {};
  for (const [key, element] of Object.entries(value)) {
    // We don't need to clone __initData field as it contains long strings
    // representing the worklet code, source map, and location, and we will
    // serialize/deserialize it once.
    if (key === '__initData' && clonedProps.__initData !== undefined) {
      continue;
    }
    clonedProps[key] = createSerializable(element, shouldPersistRemote, depth + 1);
  }
  return clonedProps;
}
function cloneInitializer(value, shouldPersistRemote = false, depth = 0) {
  const clonedProps = cloneObjectProperties(value, shouldPersistRemote, depth);
  return WorkletsModule.createSerializableInitializer(clonedProps);
}
function cloneArray(value, shouldPersistRemote, depth) {
  const clonedElements = value.map(element => createSerializable(element, shouldPersistRemote, depth + 1));
  const clone = WorkletsModule.createSerializableArray(clonedElements, shouldPersistRemote);
  serializableMappingCache.set(value, clone);
  serializableMappingCache.set(clone);
  freezeObjectInDev(value);
  return clone;
}
function cloneRemoteFunction(value) {
  const clone = WorkletsModule.createSerializableFunction(value);
  serializableMappingCache.set(value, clone);
  serializableMappingCache.set(clone);
  freezeObjectInDev(value);
  return clone;
}
function cloneHostObject(value) {
  // for host objects we pass the reference to the object as serializable and
  // then recreate new host object wrapping the same instance on the UI thread.
  // there is no point of iterating over keys as we do for regular objects.
  const clone = WorkletsModule.createSerializableHostObject(value);
  serializableMappingCache.set(value, clone);
  serializableMappingCache.set(clone);
  return clone;
}
function cloneWorklet(value, shouldPersistRemote, depth) {
  if (__DEV__) {
    const babelVersion = value.__pluginVersion;
    if (babelVersion !== undefined && babelVersion !== jsVersion) {
      throw new WorkletsError(`Mismatch between JavaScript code version and Worklets Babel plugin version (${jsVersion} vs. ${babelVersion}).
    See \`https://docs.swmansion.com/react-native-worklets/docs/guides/troubleshooting#mismatch-between-javascript-code-version-and-worklets-babel-plugin-version\` for more details.
    Offending code was: \`${getWorkletCode(value)}\``);
    }
    registerWorkletStackDetails(value.__workletHash, value.__stackDetails);
  }
  if (value.__stackDetails) {
    // `Error` type of value cannot be copied to the UI thread, so we
    // remove it after we handled it in dev mode or delete it to ignore it in production mode.
    // Not removing this would cause an infinite loop in production mode and it just
    // seems more elegant to handle it this way.
    delete value.__stackDetails;
  }
  const clonedProps = cloneObjectProperties(value, true, depth);
  // to save on transferring static __initData field of worklet structure
  // we request serializable value to persist its UI counterpart. This means
  // that the __initData field that contains long strings representing the
  // worklet code, source map, and location, will always be
  // serialized/deserialized once.
  clonedProps.__initData = createSerializable(value.__initData, true, depth + 1);
  const clone = WorkletsModule.createSerializableWorklet(clonedProps,
  // TODO: Check after refactor if we can remove shouldPersistRemote parameter (imho it's redundant here since worklets are always persistent)
  // retain all worklets
  true);
  serializableMappingCache.set(value, clone);
  serializableMappingCache.set(clone);
  freezeObjectInDev(value);
  return clone;
}

/**
 * TurboModuleLike objects are JS objects that have a TurboModule as their
 * prototype.
 */
function cloneTurboModuleLike(value, shouldPersistRemote, depth) {
  const proto = Object.getPrototypeOf(value);
  const clonedProps = cloneObjectProperties(value, shouldPersistRemote, depth);
  const clone = WorkletsModule.createSerializableTurboModuleLike(clonedProps, proto);
  return clone;
}
function cloneContextObject(value) {
  const workletContextObjectFactory = value.__workletContextObjectFactory;
  const handle = cloneInitializer({
    __init: () => {
      'worklet';

      return workletContextObjectFactory();
    }
  });
  serializableMappingCache.set(value, handle);
  return handle;
}
function clonePlainJSObject(value, shouldPersistRemote, depth) {
  const clonedProps = cloneObjectProperties(value, shouldPersistRemote, depth);
  const clone = WorkletsModule.createSerializableObject(clonedProps, shouldPersistRemote, value);
  serializableMappingCache.set(value, clone);
  serializableMappingCache.set(clone);
  freezeObjectInDev(value);
  return clone;
}
function cloneMap(value) {
  const clonedKeys = [];
  const clonedValues = [];
  for (const [key, element] of value.entries()) {
    clonedKeys.push(createSerializable(key));
    clonedValues.push(createSerializable(element));
  }
  const clone = WorkletsModule.createSerializableMap(clonedKeys, clonedValues);
  serializableMappingCache.set(value, clone);
  serializableMappingCache.set(clone);
  freezeObjectInDev(value);
  return clone;
}
function cloneSet(value) {
  const clonedElements = [];
  for (const element of value) {
    clonedElements.push(createSerializable(element));
  }
  const clone = WorkletsModule.createSerializableSet(clonedElements);
  serializableMappingCache.set(value, clone);
  serializableMappingCache.set(clone);
  freezeObjectInDev(value);
  return clone;
}
function cloneRegExp(value) {
  const pattern = value.source;
  const flags = value.flags;
  const handle = cloneInitializer({
    __init: () => {
      'worklet';

      return new RegExp(pattern, flags);
    }
  });
  serializableMappingCache.set(value, handle);
  return handle;
}
function cloneError(value) {
  const {
    name,
    message,
    stack
  } = value;
  const handle = cloneInitializer({
    __init: () => {
      'worklet';

      // eslint-disable-next-line reanimated/use-worklets-error
      const error = new Error();
      error.name = name;
      error.message = message;
      error.stack = stack;
      return error;
    }
  });
  serializableMappingCache.set(value, handle);
  return handle;
}
function cloneArrayBuffer(value, shouldPersistRemote) {
  const clone = WorkletsModule.createSerializable(value, shouldPersistRemote, value);
  serializableMappingCache.set(value, clone);
  serializableMappingCache.set(clone);
  return clone;
}
function cloneArrayBufferView(value) {
  const buffer = value.buffer;
  const typeName = value.constructor.name;
  const handle = cloneInitializer({
    __init: () => {
      'worklet';

      if (!VALID_ARRAY_VIEWS_NAMES.includes(typeName)) {
        throw new WorkletsError(`Invalid array view name \`${typeName}\`.`);
      }
      const constructor = global[typeName];
      if (constructor === undefined) {
        throw new WorkletsError(`Constructor for \`${typeName}\` not found.`);
      }
      return new constructor(buffer);
    }
  });
  serializableMappingCache.set(value, handle);
  return handle;
}
function cloneSynchronizable(value) {
  serializableMappingCache.set(value);
  return value;
}
function cloneImport(value) {
  const {
    source,
    imported
  } = value.__bundleData;
  const clone = WorkletsModule.createSerializableImport(source, imported);
  serializableMappingCache.set(value, clone);
  serializableMappingCache.set(clone);
  return clone;
}
function inaccessibleObject(value) {
  // This is reached for object types that are not of plain Object.prototype.
  // We don't support such objects from being transferred as serializables to
  // the UI runtime and hence we replace them with "inaccessible object"
  // which is implemented as a Proxy object that throws on any attempt
  // of accessing its fields. We argue that such objects can sometimes leak
  // as attributes of objects being captured by worklets but should never
  // be used on the UI runtime regardless. If they are being accessed, the user
  // will get an appropriate error message.
  const clone = createSerializable(INACCESSIBLE_OBJECT);
  serializableMappingCache.set(value, clone);
  return clone;
}
const WORKLET_CODE_THRESHOLD = 255;
function getWorkletCode(value) {
  const code = value?.__initData?.code;
  if (!code) {
    return 'unknown';
  }
  if (code.length > WORKLET_CODE_THRESHOLD) {
    return `${code.substring(0, WORKLET_CODE_THRESHOLD)}...`;
  }
  return code;
}
function isRemoteFunction(value) {
  'worklet';

  return !!value.__remoteFunction;
}

/**
 * We freeze
 *
 * - Arrays,
 * - Remote functions,
 * - Plain JS objects,
 *
 * That are transformed to a serializable with a meaningful warning. This should
 * help detect issues when someone modifies data after it's been converted.
 * Meaning that they may be doing a faulty assumption in their code expecting
 * that the updates are going to automatically propagate to the object sent to
 * the UI thread. If the user really wants some objects to be mutable they
 * should use shared values instead.
 */
function freezeObjectInDev(value) {
  if (!__DEV__) {
    return;
  }
  Object.entries(value).forEach(([key, element]) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor.configurable) {
      return;
    }
    Object.defineProperty(value, key, {
      get() {
        return element;
      },
      set() {
        logger.warn(`Tried to modify key \`${key}\` of an object which has been already passed to a worklet. See
        https://docs.swmansion.com/react-native-reanimated/docs/guides/troubleshooting#tried-to-modify-key-of-an-object-which-has-been-converted-to-a-serializable
        for more details.`);
      }
    });
  });
  Object.preventExtensions(value);
}
function makeShareableCloneOnUIRecursiveLEGACY(value) {
  'worklet';

  if (SHOULD_BE_USE_WEB) {
    // @ts-ignore web is an interesting place where we don't run a secondary VM on the UI thread
    // see more details in the comment where USE_STUB_IMPLEMENTATION is defined.
    return value;
  }
  // eslint-disable-next-line @typescript-eslint/no-shadow
  function cloneRecursive(value) {
    if (typeof value === 'object' && value !== null || typeof value === 'function') {
      if (isHostObject(value)) {
        // We call `_createSerializableClone` to wrap the provided HostObject
        // inside SerializableJSRef.
        return global._createSerializableHostObject(value);
      }
      if (isRemoteFunction(value)) {
        // RemoteFunctions are created by us therefore they are
        // a Serializable out of the box and there is no need to
        // call `_createSerializableClone`.
        return value.__remoteFunction;
      }
      if (Array.isArray(value)) {
        return global._createSerializableArray(value.map(cloneRecursive));
      }
      if (value.__synchronizableRef) {
        return global._createSerializableSynchronizable(value);
      }
      const toAdapt = {};
      for (const [key, element] of Object.entries(value)) {
        toAdapt[key] = cloneRecursive(element);
      }
      return global._createSerializable(toAdapt, value);
    }
    if (typeof value === 'string') {
      return global._createSerializableString(value);
    }
    if (typeof value === 'number') {
      return global._createSerializableNumber(value);
    }
    if (typeof value === 'boolean') {
      return global._createSerializableBoolean(value);
    }
    if (typeof value === 'bigint') {
      return global._createSerializableBigInt(value);
    }
    if (value === undefined) {
      return global._createSerializableUndefined();
    }
    if (value === null) {
      return global._createSerializableNull();
    }
    return global._createSerializable(value, undefined);
  }
  return cloneRecursive(value);
}

/** @deprecated This function is no longer supported. */
export const makeShareableCloneOnUIRecursive = globalThis._WORKLETS_BUNDLE_MODE ? createSerializable : makeShareableCloneOnUIRecursiveLEGACY;
function makeShareableJS(value) {
  return value;
}
function makeShareableNative(value) {
  if (serializableMappingCache.get(value)) {
    return value;
  }
  const handle = createSerializable({
    __init: () => {
      'worklet';

      return value;
    }
  });
  serializableMappingCache.set(value, handle);
  return value;
}

/**
 * This function creates a value on UI with persistent state - changes to it on
 * the UI thread will be seen by all worklets. Use it when you want to create a
 * value that is read and written only on the UI thread.
 */
/** @deprecated This function is no longer supported. */
export const makeShareable = SHOULD_BE_USE_WEB ? makeShareableJS : makeShareableNative;
//# sourceMappingURL=serializable.js.map