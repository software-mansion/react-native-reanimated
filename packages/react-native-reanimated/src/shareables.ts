'use strict';
import { isWorkletFunction } from './commonTypes';
import type {
  ShareableRef,
  FlatShareableRef,
  WorkletFunction,
  WorkletFunctionDev,
} from './commonTypes';
import { shouldBeUseWeb } from './PlatformChecker';
import { ReanimatedError, registerWorkletStackDetails } from './errors';
import { jsVersion } from './platform-specific/jsVersion';
import {
  shareableMappingCache,
  shareableMappingFlag,
} from './shareableMappingCache';
import { logger } from './logger';
import { WorkletsModule } from './worklets';

// for web/chrome debugger/jest environments this file provides a stub implementation
// where no shareable references are used. Instead, the objects themselves are used
// instead of shareable references, because of the fact that we don't have to deal with
// running the code on separate VMs.
const SHOULD_BE_USE_WEB = shouldBeUseWeb();

const MAGIC_KEY = 'REANIMATED_MAGIC_KEY';

function isHostObject(value: NonNullable<object>) {
  'worklet';
  // We could use JSI to determine whether an object is a host object, however
  // the below workaround works well and is way faster than an additional JSI call.
  // We use the fact that host objects have broken implementation of `hasOwnProperty`
  // and hence return true for all `in` checks regardless of the key we ask for.
  return MAGIC_KEY in value;
}

function isPlainJSObject(object: object): object is Record<string, unknown> {
  return Object.getPrototypeOf(object) === Object.prototype;
}

function getFromCache(value: object) {
  const cached = shareableMappingCache.get(value);
  if (cached === shareableMappingFlag) {
    // This means that `value` was already a clone and we should return it as is.
    return value;
  }
  return cached;
}

// The below object is used as a replacement for objects that cannot be transferred
// as shareable values. In makeShareableCloneRecursive we detect if an object is of
// a plain Object.prototype and only allow such objects to be transferred. This lets
// us avoid all sorts of react internals from leaking into the UI runtime. To make it
// possible to catch errors when someone actually tries to access such object on the UI
// runtime, we use the below Proxy object which is instantiated on the UI runtime and
// throws whenever someone tries to access its fields.
const INACCESSIBLE_OBJECT = {
  __init: () => {
    'worklet';
    return new Proxy(
      {},
      {
        get: (_: unknown, prop: string | symbol) => {
          if (
            prop === '_isReanimatedSharedValue' ||
            prop === '__remoteFunction'
          ) {
            // not very happy about this check here, but we need to allow for
            // "inaccessible" objects to be tested with isSharedValue check
            // as it is being used in the mappers when extracting inputs recursively
            // as well as with isRemoteFunction when cloning objects recursively.
            // Apparently we can't check if a key exists there as HostObjects always
            // return true for such tests, so the only possibility for us is to
            // actually access that key and see if it is set to true. We therefore
            // need to allow for this key to be accessed here.
            return false;
          }
          throw new ReanimatedError(
            `Trying to access property \`${String(
              prop
            )}\` of an object which cannot be sent to the UI runtime.`
          );
        },
        set: () => {
          throw new ReanimatedError(
            'Trying to write to an object which cannot be sent to the UI runtime.'
          );
        },
      }
    );
  },
};

const VALID_ARRAY_VIEWS_NAMES = [
  'Int8Array',
  'Uint8Array',
  'Uint8ClampedArray',
  'Int16Array',
  'Uint16Array',
  'Int32Array',
  'Uint32Array',
  'Float32Array',
  'Float64Array',
  'BigInt64Array',
  'BigUint64Array',
  'DataView',
];

const DETECT_CYCLIC_OBJECT_DEPTH_THRESHOLD = 30;
// Below variable stores object that we process in makeShareableCloneRecursive at the specified depth.
// We use it to check if later on the function reenters with the same object
let processedObjectAtThresholdDepth: unknown;

function makeShareableCloneRecursiveWeb<T>(value: T): ShareableRef<T> {
  return value as ShareableRef<T>;
}

function makeShareableCloneRecursiveNative<T>(
  value: T,
  shouldPersistRemote = false,
  depth = 0
): ShareableRef<T> {
  detectCyclicObject(value, depth);

  const isObject = typeof value === 'object';
  const isFunction = typeof value === 'function';

  if ((!isObject && !isFunction) || value === null) {
    return clonePrimitive(value, shouldPersistRemote);
  }

  const cached = getFromCache(value);
  if (cached !== undefined) {
    return cached as ShareableRef<T>;
  }

  if (Array.isArray(value)) {
    return cloneArray(value, shouldPersistRemote, depth);
  }
  if (isFunction && !isWorkletFunction(value)) {
    return cloneRemoteFunction(value, shouldPersistRemote);
  }
  if (isHostObject(value)) {
    return cloneHostObject(value, shouldPersistRemote);
  }
  if (isPlainJSObject(value) && value.__workletContextObjectFactory) {
    return cloneContextObject(value);
  }
  if ((isPlainJSObject(value) || isFunction) && isWorkletFunction(value)) {
    return cloneWorklet(value, shouldPersistRemote, depth);
  }
  if (isPlainJSObject(value) || isFunction) {
    return clonePlainJSObject(value, shouldPersistRemote, depth);
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

interface MakeShareableClone {
  <T>(value: T, shouldPersistRemote?: boolean, depth?: number): ShareableRef<T>;
}

export const makeShareableCloneRecursive: MakeShareableClone = SHOULD_BE_USE_WEB
  ? makeShareableCloneRecursiveWeb
  : makeShareableCloneRecursiveNative;

function detectCyclicObject(value: unknown, depth: number) {
  if (depth >= DETECT_CYCLIC_OBJECT_DEPTH_THRESHOLD) {
    // if we reach certain recursion depth we suspect that we are dealing with a cyclic object.
    // this type of objects are not supported and cannot be transferred as shareable, so we
    // implement a simple detection mechanism that remembers the value at a given depth and
    // tests whether we try reenter this method later on with the same value. If that happens
    // we throw an appropriate error.
    if (depth === DETECT_CYCLIC_OBJECT_DEPTH_THRESHOLD) {
      processedObjectAtThresholdDepth = value;
    } else if (value === processedObjectAtThresholdDepth) {
      throw new ReanimatedError(
        'Trying to convert a cyclic object to a shareable. This is not supported.'
      );
    }
  } else {
    processedObjectAtThresholdDepth = undefined;
  }
}

function clonePrimitive<T>(
  value: T,
  shouldPersistRemote: boolean
): ShareableRef<T> {
  return WorkletsModule.makeShareableClone(value, shouldPersistRemote);
}

function cloneArray<T extends unknown[]>(
  value: T,
  shouldPersistRemote: boolean,
  depth: number
): ShareableRef<T> {
  const clonedElements = value.map((element) =>
    makeShareableCloneRecursive(element, shouldPersistRemote, depth + 1)
  );
  const clone = WorkletsModule.makeShareableClone(
    clonedElements,
    shouldPersistRemote,
    value
  ) as ShareableRef<T>;
  shareableMappingCache.set(value, clone);
  shareableMappingCache.set(clone);

  freezeObjectInDev(value);
  return clone;
}

function cloneRemoteFunction<T extends object>(
  value: T,
  shouldPersistRemote: boolean
): ShareableRef<T> {
  const clone = WorkletsModule.makeShareableClone(
    value,
    shouldPersistRemote,
    value
  );
  shareableMappingCache.set(value, clone);
  shareableMappingCache.set(clone);

  freezeObjectInDev(value);
  return clone;
}

function cloneHostObject<T extends object>(
  value: T,
  shouldPersistRemote: boolean
): ShareableRef<T> {
  // for host objects we pass the reference to the object as shareable and
  // then recreate new host object wrapping the same instance on the UI thread.
  // there is no point of iterating over keys as we do for regular objects.
  const clone = WorkletsModule.makeShareableClone(
    value,
    shouldPersistRemote,
    value
  );
  shareableMappingCache.set(value, clone);
  shareableMappingCache.set(clone);

  return clone;
}

function cloneWorklet<T extends WorkletFunction>(
  value: T,
  shouldPersistRemote: boolean,
  depth: number
): ShareableRef<T> {
  if (__DEV__) {
    const babelVersion = (value as WorkletFunctionDev).__initData.version;
    if (babelVersion !== undefined && babelVersion !== jsVersion) {
      throw new ReanimatedError(`[Reanimated] Mismatch between JavaScript code version and Reanimated Babel plugin version (${jsVersion} vs. ${babelVersion}).        
See \`https://docs.swmansion.com/react-native-reanimated/docs/guides/troubleshooting#mismatch-between-javascript-code-version-and-reanimated-babel-plugin-version\` for more details.
Offending code was: \`${getWorkletCode(value)}\``);
    }
    registerWorkletStackDetails(
      value.__workletHash,
      (value as WorkletFunctionDev).__stackDetails!
    );
  }
  if ((value as WorkletFunctionDev).__stackDetails) {
    // `Error` type of value cannot be copied to the UI thread, so we
    // remove it after we handled it in dev mode or delete it to ignore it in production mode.
    // Not removing this would cause an infinite loop in production mode and it just
    // seems more elegant to handle it this way.
    delete (value as WorkletFunctionDev).__stackDetails;
  }
  // to save on transferring static __initData field of worklet structure
  // we request shareable value to persist its UI counterpart. This means
  // that the __initData field that contains long strings represeting the
  // worklet code, source map, and location, will always be
  // serialized/deserialized once.
  const clonedProps: Record<string, unknown> = {};
  clonedProps.__initData = makeShareableCloneRecursive(
    value.__initData,
    true,
    depth + 1
  );

  for (const [key, element] of Object.entries(value)) {
    if (key === '__initData' && clonedProps.__initData !== undefined) {
      continue;
    }
    clonedProps[key] = makeShareableCloneRecursive(
      element,
      shouldPersistRemote,
      depth + 1
    );
  }
  const clone = WorkletsModule.makeShareableClone(
    clonedProps,
    // retain all worklets
    true,
    value
  ) as ShareableRef<T>;
  shareableMappingCache.set(value, clone);
  shareableMappingCache.set(clone);

  freezeObjectInDev(value);
  return clone;
}

function cloneContextObject<T extends object>(value: T): ShareableRef<T> {
  const workletContextObjectFactory = (value as Record<string, unknown>)
    .__workletContextObjectFactory as () => T;
  const handle = makeShareableCloneRecursive({
    __init: () => {
      'worklet';
      return workletContextObjectFactory();
    },
  });
  shareableMappingCache.set(value, handle);
  return handle as ShareableRef<T>;
}

function clonePlainJSObject<T extends object>(
  value: T,
  shouldPersistRemote: boolean,
  depth: number
): ShareableRef<T> {
  const clonedProps: Record<string, unknown> = {};
  for (const [key, element] of Object.entries(value)) {
    if (key === '__initData' && clonedProps.__initData !== undefined) {
      continue;
    }
    clonedProps[key] = makeShareableCloneRecursive(
      element,
      shouldPersistRemote,
      depth + 1
    );
  }
  const clone = WorkletsModule.makeShareableClone(
    clonedProps,
    shouldPersistRemote,
    value
  ) as ShareableRef<T>;
  shareableMappingCache.set(value, clone);
  shareableMappingCache.set(clone);

  freezeObjectInDev(value);
  return clone;
}

function cloneRegExp<T extends RegExp>(value: T): ShareableRef<T> {
  const pattern = value.source;
  const flags = value.flags;
  const handle = makeShareableCloneRecursive({
    __init: () => {
      'worklet';
      return new RegExp(pattern, flags);
    },
  }) as unknown as ShareableRef<T>;
  shareableMappingCache.set(value, handle);

  return handle;
}

function cloneError<T extends Error>(value: T): ShareableRef<T> {
  const { name, message, stack } = value;
  const handle = makeShareableCloneRecursive({
    __init: () => {
      'worklet';
      // eslint-disable-next-line reanimated/use-reanimated-error
      const error = new Error();
      error.name = name;
      error.message = message;
      error.stack = stack;
      return error;
    },
  });
  shareableMappingCache.set(value, handle);
  return handle as unknown as ShareableRef<T>;
}

function cloneArrayBuffer<T extends ArrayBuffer>(
  value: T,
  shouldPersistRemote: boolean
): ShareableRef<T> {
  const clone = WorkletsModule.makeShareableClone(
    value,
    shouldPersistRemote,
    value
  );
  shareableMappingCache.set(value, clone);
  shareableMappingCache.set(clone);

  return clone;
}

function cloneArrayBufferView<T extends ArrayBufferView>(
  value: T
): ShareableRef<T> {
  const buffer = value.buffer;
  const typeName = value.constructor.name;
  const handle = makeShareableCloneRecursive({
    __init: () => {
      'worklet';
      if (!VALID_ARRAY_VIEWS_NAMES.includes(typeName)) {
        throw new ReanimatedError(
          `[Reanimated] Invalid array view name \`${typeName}\`.`
        );
      }
      const constructor = global[typeName as keyof typeof global];
      if (constructor === undefined) {
        throw new ReanimatedError(
          `[Reanimated] Constructor for \`${typeName}\` not found.`
        );
      }
      return new constructor(buffer);
    },
  }) as unknown as ShareableRef<T>;
  shareableMappingCache.set(value, handle);

  return handle;
}

function inaccessibleObject<T extends object>(value: T): ShareableRef<T> {
  // This is reached for object types that are not of plain Object.prototype.
  // We don't support such objects from being transferred as shareables to
  // the UI runtime and hence we replace them with "inaccessible object"
  // which is implemented as a Proxy object that throws on any attempt
  // of accessing its fields. We argue that such objects can sometimes leak
  // as attributes of objects being captured by worklets but should never
  // be used on the UI runtime regardless. If they are being accessed, the user
  // will get an appropriate error message.
  const clone = makeShareableCloneRecursive<T>(INACCESSIBLE_OBJECT as T);
  shareableMappingCache.set(value, clone);
  return clone;
}

const WORKLET_CODE_THRESHOLD = 255;

function getWorkletCode(value: WorkletFunction) {
  const code = value?.__initData?.code;
  if (!code) {
    return 'unknown';
  }
  if (code.length > WORKLET_CODE_THRESHOLD) {
    return `${code.substring(0, WORKLET_CODE_THRESHOLD)}...`;
  }
  return code;
}

type RemoteFunction<T> = {
  __remoteFunction: FlatShareableRef<T>;
};

function isRemoteFunction<T>(value: {
  __remoteFunction?: unknown;
}): value is RemoteFunction<T> {
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
 * That are transformed to a shareable with a meaningful warning. This should
 * help detect issues when someone modifies data after it's been converted.
 * Meaning that they may be doing a faulty assumption in their code expecting
 * that the updates are going to automatically propagate to the object sent to
 * the UI thread. If the user really wants some objects to be mutable they
 * should use shared values instead.
 */
function freezeObjectInDev<T extends object>(value: T) {
  if (!__DEV__) {
    return;
  }
  Object.entries(value).forEach(([key, element]) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
    if (!descriptor.configurable) {
      return;
    }
    Object.defineProperty(value, key, {
      get() {
        return element;
      },
      set() {
        logger.warn(
          `Tried to modify key \`${key}\` of an object which has been already passed to a worklet. See 
https://docs.swmansion.com/react-native-reanimated/docs/guides/troubleshooting#tried-to-modify-key-of-an-object-which-has-been-converted-to-a-shareable 
for more details.`
        );
      },
    });
  });
  Object.preventExtensions(value);
}

export function makeShareableCloneOnUIRecursive<T>(
  value: T
): FlatShareableRef<T> {
  'worklet';
  if (SHOULD_BE_USE_WEB) {
    // @ts-ignore web is an interesting place where we don't run a secondary VM on the UI thread
    // see more details in the comment where USE_STUB_IMPLEMENTATION is defined.
    return value;
  }
  // eslint-disable-next-line @typescript-eslint/no-shadow
  function cloneRecursive(value: T): FlatShareableRef<T> {
    if (
      (typeof value === 'object' && value !== null) ||
      typeof value === 'function'
    ) {
      if (isHostObject(value)) {
        // We call `_makeShareableClone` to wrap the provided HostObject
        // inside ShareableJSRef.
        return global._makeShareableClone(
          value,
          undefined
        ) as FlatShareableRef<T>;
      }
      if (isRemoteFunction<T>(value)) {
        // RemoteFunctions are created by us therefore they are
        // a Shareable out of the box and there is no need to
        // call `_makeShareableClone`.
        return value.__remoteFunction;
      }
      if (Array.isArray(value)) {
        return global._makeShareableClone(
          value.map(cloneRecursive),
          undefined
        ) as FlatShareableRef<T>;
      }
      const toAdapt: Record<string, FlatShareableRef<T>> = {};
      for (const [key, element] of Object.entries(value)) {
        toAdapt[key] = cloneRecursive(element);
      }
      return global._makeShareableClone(toAdapt, value) as FlatShareableRef<T>;
    }
    return global._makeShareableClone(value, undefined);
  }
  return cloneRecursive(value);
}

function makeShareableJS<T extends object>(value: T): T {
  return value;
}

function makeShareableNative<T extends object>(value: T): T {
  if (shareableMappingCache.get(value)) {
    return value;
  }
  const handle = makeShareableCloneRecursive({
    __init: () => {
      'worklet';
      return value;
    },
  });
  shareableMappingCache.set(value, handle);
  return value;
}

/**
 * This function creates a value on UI with persistent state - changes to it on
 * the UI thread will be seen by all worklets. Use it when you want to create a
 * value that is read and written only on the UI thread.
 */
export const makeShareable = SHOULD_BE_USE_WEB
  ? makeShareableJS
  : makeShareableNative;
