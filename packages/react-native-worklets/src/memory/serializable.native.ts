'use strict';

import { registerWorkletStackDetails } from '../debug/errors';
import { jsVersion } from '../debug/jsVersion';
import { logger } from '../debug/logger';
import { WorkletsError } from '../debug/WorkletsError';
import { getRuntimeKind, RuntimeKind } from '../runtimeKind';
import type { WorkletFunction, WorkletImport } from '../types';
import { isWorkletFunction } from '../workletFunction';
import { WorkletsModule } from '../WorkletsModule/NativeWorklets';
import { isSynchronizable } from './isSynchronizable';
import {
  serializableMappingCache,
  serializableMappingFlag,
} from './serializableMappingCache';
import type {
  FlatSerializableRef,
  RegistrationData,
  SerializableRef,
  SerializationData,
  Synchronizable,
} from './types';

const MAGIC_KEY = 'REANIMATED_MAGIC_KEY';

function isHostObject(value: NonNullable<object>) {
  'worklet';
  // We could use JSI to determine whether an object is a host object, however
  // the below workaround works well and is way faster than an additional JSI call.
  // We use the fact that host objects have broken implementation of `hasOwnProperty`
  // and hence return true for all `in` checks regardless of the key we ask for.
  return MAGIC_KEY in value;
}

export function isSerializableRef<TValue = unknown>(
  value: unknown
): value is SerializableRef<TValue> {
  'worklet';
  return (
    typeof value === 'object' &&
    value !== null &&
    '__serializableRef' in value &&
    value.__serializableRef === true
  );
}

function isPlainJSObject(object: object): object is Record<string, unknown> {
  'worklet';
  return Object.getPrototypeOf(object) === Object.prototype;
}

function isTurboModuleLike(object: object): object is Record<string, unknown> {
  return isHostObject(Object.getPrototypeOf(object));
}

function getFromCache(value: object) {
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
    return new Proxy(
      {},
      {
        get: (_: unknown, prop: string | symbol) => {
          if (
            prop === '_isReanimatedSharedValue' ||
            prop === '__remoteFunction' ||
            prop === '__synchronizableRef'
          ) {
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
          throw new WorkletsError(
            `Trying to access property \`${String(
              prop
            )}\` of an object which cannot be sent to the UI runtime.`
          );
        },
        set: () => {
          throw new WorkletsError(
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
// Below variable stores object that we process in createSerializable at the specified depth.
// We use it to check if later on the function reenters with the same object
let processedObjectAtThresholdDepth: unknown;

export function createSerializable<TValue>(
  value: TValue,
  shouldPersistRemote = false,
  depth = 0
): SerializableRef<TValue> {
  detectCyclicObject(value, depth);

  const isObject = typeof value === 'object';
  const isFunction = typeof value === 'function';

  if (typeof value === 'string') {
    return cloneString(value) as SerializableRef<TValue>;
  }

  if (typeof value === 'number') {
    return cloneNumber(value) as SerializableRef<TValue>;
  }

  if (typeof value === 'boolean') {
    return cloneBoolean(value) as SerializableRef<TValue>;
  }

  if (typeof value === 'bigint') {
    return cloneBigInt(value) as SerializableRef<TValue>;
  }

  if (value === undefined) {
    return cloneUndefined() as SerializableRef<TValue>;
  }

  if (value === null) {
    return cloneNull() as SerializableRef<TValue>;
  }

  if ((!isObject && !isFunction) || value === null) {
    return clonePrimitive(value, shouldPersistRemote);
  }

  const cached = getFromCache(value);
  if (cached !== undefined) {
    return cached as SerializableRef<TValue>;
  }

  if (Array.isArray(value)) {
    return cloneArray(value, shouldPersistRemote, depth);
  }
  if (
    globalThis._WORKLETS_BUNDLE_MODE &&
    isFunction &&
    (value as WorkletImport).__bundleData
  ) {
    return cloneImport(value as WorkletImport) as SerializableRef<TValue>;
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
    return cloneInitializer(
      value,
      shouldPersistRemote,
      depth
    ) as SerializableRef<TValue>;
  }
  if (isPlainJSObject(value) && value.__workletContextObjectFactory) {
    return cloneContextObject(value);
  }
  if ((isPlainJSObject(value) || isFunction) && isWorkletFunction(value)) {
    return cloneWorklet(value, shouldPersistRemote, depth);
  }
  if (isSynchronizable(value)) {
    return cloneSynchronizable(value) as SerializableRef<TValue>;
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
  for (let i = 0; i < customSerializationRegistry.length; i++) {
    const { determine, pack } = customSerializationRegistry[i];
    if (determine(value)) {
      return cloneCustom(value, pack, i) as SerializableRef<TValue>;
    }
  }
  return inaccessibleObject(value);
}

if (globalThis._WORKLETS_BUNDLE_MODE) {
  // TODO: Do it programmatically.
  createSerializable.__bundleData = {
    imported: 'createSerializable',
    source: require.resolveWeak('react-native-worklets'),
  };
}

if (!globalThis.__customSerializationRegistry) {
  globalThis.__customSerializationRegistry =
    [] as typeof globalThis.__customSerializationRegistry;
}
const customSerializationRegistry = globalThis.__customSerializationRegistry;

/**
 * `registerCustomSerializable` lets you register your own pre-serialization and
 * post-deserialization logic. This is necessary for objects with prototypes
 * different than just `Object.prototype` or some other built-in prototypes like
 * `Map` etc. Worklets can't handle such objects by default to convert into
 * [Serializables](https://docs.swmansion.com/react-native-worklets/docs/memory/serializable)
 * hence you need to register them as **Custom Serializables**. This way you can
 * tell Worklets how to transfer your custom data structures between different
 * Runtimes without manually serializing and deserializing them every time.
 *
 * @param registrationData - The registration data for the custom serializable -
 *   {@link RegistrationData}
 * @see https://docs.swmansion.com/react-native-worklets/docs/memory/registerCustomSerializable/
 */
export function registerCustomSerializable<
  TValue extends object,
  TPacked extends object,
>(registrationData: RegistrationData<TValue, TPacked>) {
  if (__DEV__ && getRuntimeKind() !== RuntimeKind.ReactNative) {
    throw new WorkletsError(
      'registerCustomSerializable can be used only on React Native runtime.'
    );
  }

  const { name, determine, pack, unpack } = registrationData;

  if (__DEV__) {
    verifyRegistrationData(determine, pack, unpack);
  }
  if (customSerializationRegistry.some((data) => data.name === name)) {
    if (__DEV__) {
      console.warn(
        `Custom serializable with name "${name}" is already registered. Duplicate registration is ignored.`
      );
    }
    return;
  }

  customSerializationRegistry.push(
    registrationData as unknown as SerializationData<object, unknown>
  );

  WorkletsModule.registerCustomSerializable(
    createSerializable(determine),
    createSerializable(pack),
    createSerializable(unpack),
    customSerializationRegistry.length - 1
  );
}

function verifyRegistrationData(
  determine: unknown,
  pack: unknown,
  unpack: unknown
) {
  if (!isWorkletFunction(determine)) {
    throw new WorkletsError(
      'The "determine" function provided to registerCustomSerializable must be a worklet.'
    );
  }
  if (!isWorkletFunction(pack)) {
    throw new WorkletsError(
      'The "pack" function provided to registerCustomSerializable must be a worklet.'
    );
  }
  if (!isWorkletFunction(unpack)) {
    throw new WorkletsError(
      'The "unpack" function provided to registerCustomSerializable must be a worklet.'
    );
  }
}

function detectCyclicObject(value: unknown, depth: number) {
  if (depth >= DETECT_CYCLIC_OBJECT_DEPTH_THRESHOLD) {
    // if we reach certain recursion depth we suspect that we are dealing with a cyclic object.
    // this type of objects are not supported and cannot be transferred as serializable, so we
    // implement a simple detection mechanism that remembers the value at a given depth and
    // tests whether we try reenter this method later on with the same value. If that happens
    // we throw an appropriate error.
    if (depth === DETECT_CYCLIC_OBJECT_DEPTH_THRESHOLD) {
      processedObjectAtThresholdDepth = value;
    } else if (value === processedObjectAtThresholdDepth) {
      throw new WorkletsError(
        'Trying to convert a cyclic object to a serializable. This is not supported.'
      );
    }
  } else {
    processedObjectAtThresholdDepth = undefined;
  }
}

function clonePrimitive<T>(
  value: T,
  shouldPersistRemote: boolean
): SerializableRef<T> {
  return WorkletsModule.createSerializable(value, shouldPersistRemote);
}

function cloneString(value: string): SerializableRef<string> {
  return WorkletsModule.createSerializableString(value);
}

function cloneNumber(value: number): SerializableRef<number> {
  return WorkletsModule.createSerializableNumber(value);
}

function cloneBoolean(value: boolean): SerializableRef<boolean> {
  return WorkletsModule.createSerializableBoolean(value);
}

function cloneBigInt(value: bigint): SerializableRef<bigint> {
  return WorkletsModule.createSerializableBigInt(value);
}

function cloneUndefined(): SerializableRef<undefined> {
  return WorkletsModule.createSerializableUndefined();
}

function cloneNull(): SerializableRef<null> {
  return WorkletsModule.createSerializableNull();
}

function cloneObjectProperties<T extends object>(
  value: T,
  shouldPersistRemote: boolean,
  depth: number
): Record<string, unknown> {
  const clonedProps: Record<string, unknown> = {};
  for (const [key, element] of Object.entries(value)) {
    // We don't need to clone __initData field as it contains long strings
    // representing the worklet code, source map, and location, and we will
    // serialize/deserialize it once.
    if (key === '__initData' && clonedProps.__initData !== undefined) {
      continue;
    }
    clonedProps[key] = createSerializable(
      element,
      shouldPersistRemote,
      depth + 1
    );
  }
  return clonedProps;
}

function cloneInitializer(
  value: object,
  shouldPersistRemote = false,
  depth = 0
): SerializableRef<object> {
  const clonedProps: Record<string, unknown> = cloneObjectProperties(
    value,
    shouldPersistRemote,
    depth
  );
  return WorkletsModule.createSerializableInitializer(clonedProps);
}

function cloneArray<T extends unknown[]>(
  value: T,
  shouldPersistRemote: boolean,
  depth: number
): SerializableRef<T> {
  const clonedElements = value.map((element) =>
    createSerializable(element, shouldPersistRemote, depth + 1)
  );
  const clone = WorkletsModule.createSerializableArray(
    clonedElements,
    shouldPersistRemote
  ) as SerializableRef<T>;
  serializableMappingCache.set(value, clone);
  serializableMappingCache.set(clone);

  freezeObjectInDev(value);
  return clone;
}

function cloneRemoteFunction<TArgs extends unknown[], TReturn>(
  value: (...args: TArgs) => TReturn
): SerializableRef<TReturn> {
  const clone = WorkletsModule.createSerializableFunction(value);
  serializableMappingCache.set(value, clone);
  serializableMappingCache.set(clone);

  freezeObjectInDev(value);
  return clone;
}

function cloneHostObject<T extends object>(value: T): SerializableRef<T> {
  // for host objects we pass the reference to the object as serializable and
  // then recreate new host object wrapping the same instance on the UI thread.
  // there is no point of iterating over keys as we do for regular objects.
  const clone = WorkletsModule.createSerializableHostObject(value);
  serializableMappingCache.set(value, clone);
  serializableMappingCache.set(clone);

  return clone;
}

function cloneWorklet<TValue extends WorkletFunction>(
  value: TValue,
  shouldPersistRemote: boolean,
  depth: number
): SerializableRef<TValue> {
  if (__DEV__) {
    const babelVersion = (value as WorkletFunction).__pluginVersion;
    if (babelVersion !== undefined && babelVersion !== jsVersion) {
      throw new WorkletsError(
        `Mismatch between JavaScript code version and Worklets Babel plugin version (${jsVersion} vs. ${babelVersion}).
    See \`https://docs.swmansion.com/react-native-worklets/docs/guides/troubleshooting#mismatch-between-javascript-code-version-and-worklets-babel-plugin-version\` for more details.
    Offending code was: \`${getWorkletCode(value)}\``
      );
    }
    registerWorkletStackDetails(
      value.__workletHash,
      (value as WorkletFunction).__stackDetails!
    );
  }
  if ((value as WorkletFunction).__stackDetails) {
    // `Error` type of value cannot be copied to the UI thread, so we
    // remove it after we handled it in dev mode or delete it to ignore it in production mode.
    // Not removing this would cause an infinite loop in production mode and it just
    // seems more elegant to handle it this way.
    delete (value as WorkletFunction).__stackDetails;
  }
  const clonedProps: Record<string, unknown> = cloneObjectProperties(
    value,
    true,
    depth
  );
  // to save on transferring static __initData field of worklet structure
  // we request serializable value to persist its UI counterpart. This means
  // that the __initData field that contains long strings representing the
  // worklet code, source map, and location, will always be
  // serialized/deserialized once.
  clonedProps.__initData = createSerializable(
    value.__initData,
    true,
    depth + 1
  );

  const clone = WorkletsModule.createSerializableWorklet(
    clonedProps,
    // TODO: Check after refactor if we can remove shouldPersistRemote parameter (imho it's redundant here since worklets are always persistent)
    // retain all worklets
    true
  ) as SerializableRef<TValue>;
  serializableMappingCache.set(value, clone);
  serializableMappingCache.set(clone);

  freezeObjectInDev(value);
  return clone;
}

/**
 * TurboModuleLike objects are JS objects that have a TurboModule as their
 * prototype.
 */
function cloneTurboModuleLike<TValue extends object>(
  value: TValue,
  shouldPersistRemote: boolean,
  depth: number
): SerializableRef<TValue> {
  const proto = Object.getPrototypeOf(value);
  const clonedProps = cloneObjectProperties(value, shouldPersistRemote, depth);
  const clone = WorkletsModule.createSerializableTurboModuleLike(
    clonedProps,
    proto
  ) as SerializableRef<TValue>;
  return clone;
}

function cloneContextObject<TValue extends object>(
  value: TValue
): SerializableRef<TValue> {
  const workletContextObjectFactory = (value as Record<string, unknown>)
    .__workletContextObjectFactory as () => TValue;
  const handle = cloneInitializer({
    __init: () => {
      'worklet';
      return workletContextObjectFactory();
    },
  });
  serializableMappingCache.set(value, handle);
  return handle as SerializableRef<TValue>;
}

function clonePlainJSObject<TValue extends object>(
  value: TValue,
  shouldPersistRemote: boolean,
  depth: number
): SerializableRef<TValue> {
  const clonedProps: Record<string, unknown> = cloneObjectProperties(
    value,
    shouldPersistRemote,
    depth
  );
  const clone = WorkletsModule.createSerializableObject(
    clonedProps,
    shouldPersistRemote,
    value
  ) as SerializableRef<TValue>;
  serializableMappingCache.set(value, clone);
  serializableMappingCache.set(clone);

  freezeObjectInDev(value);
  return clone;
}

function cloneMap<TValue extends Map<unknown, unknown>>(
  value: TValue
): SerializableRef<TValue> {
  const clonedKeys: unknown[] = [];
  const clonedValues: unknown[] = [];
  for (const [key, element] of value.entries()) {
    clonedKeys.push(createSerializable(key));
    clonedValues.push(createSerializable(element));
  }
  const clone = WorkletsModule.createSerializableMap(
    clonedKeys,
    clonedValues
  ) as SerializableRef<TValue>;
  serializableMappingCache.set(value, clone);
  serializableMappingCache.set(clone);

  freezeObjectInDev(value);
  return clone;
}

function cloneSet<TValue extends Set<unknown>>(
  value: TValue
): SerializableRef<TValue> {
  const clonedElements: unknown[] = [];
  for (const element of value) {
    clonedElements.push(createSerializable(element));
  }
  const clone = WorkletsModule.createSerializableSet(
    clonedElements
  ) as SerializableRef<TValue>;
  serializableMappingCache.set(value, clone);
  serializableMappingCache.set(clone);

  freezeObjectInDev(value);
  return clone;
}

function cloneRegExp<TValue extends RegExp>(
  value: TValue
): SerializableRef<TValue> {
  const pattern = value.source;
  const flags = value.flags;
  const handle = cloneInitializer({
    __init: () => {
      'worklet';
      return new RegExp(pattern, flags);
    },
  }) as unknown as SerializableRef<TValue>;
  serializableMappingCache.set(value, handle);

  return handle;
}

function cloneError<TValue extends Error>(
  value: TValue
): SerializableRef<TValue> {
  const { name, message, stack } = value;
  const handle = cloneInitializer({
    __init: () => {
      'worklet';
      // eslint-disable-next-line reanimated/use-worklets-error
      const error = new Error();
      error.name = name;
      error.message = message;
      error.stack = stack;
      return error;
    },
  });
  serializableMappingCache.set(value, handle);
  return handle as unknown as SerializableRef<TValue>;
}

function cloneArrayBuffer<T extends ArrayBuffer>(
  value: T,
  shouldPersistRemote: boolean
): SerializableRef<T> {
  const clone = WorkletsModule.createSerializable(
    value,
    shouldPersistRemote,
    value
  );
  serializableMappingCache.set(value, clone);
  serializableMappingCache.set(clone);

  return clone;
}

function cloneArrayBufferView<TValue extends ArrayBufferView>(
  value: TValue
): SerializableRef<TValue> {
  const buffer = value.buffer;
  const typeName = value.constructor.name;
  const handle = cloneInitializer({
    __init: () => {
      'worklet';
      if (!VALID_ARRAY_VIEWS_NAMES.includes(typeName)) {
        throw new WorkletsError(`Invalid array view name \`${typeName}\`.`);
      }
      const constructor = global[typeName as keyof typeof global];
      if (constructor === undefined) {
        throw new WorkletsError(`Constructor for \`${typeName}\` not found.`);
      }
      return new constructor(buffer);
    },
  }) as unknown as SerializableRef<TValue>;
  serializableMappingCache.set(value, handle);

  return handle;
}

function cloneSynchronizable<TValue>(
  value: Synchronizable<TValue>
): SerializableRef<TValue> {
  serializableMappingCache.set(value);
  return value;
}

function cloneImport<TValue extends WorkletImport>(
  value: TValue
): SerializableRef<TValue> {
  const { source, imported } = value.__bundleData;
  const clone = WorkletsModule.createSerializableImport(source, imported);

  serializableMappingCache.set(value, clone);
  serializableMappingCache.set(clone);

  return clone as SerializableRef<TValue>;
}

function cloneCustom<TValue extends object, TPacked = unknown>(
  data: TValue,
  pack: (data: TValue) => TPacked,
  typeId: number
): SerializableRef<TValue> {
  const packedData = pack(data);
  const serialized = createSerializable(packedData);

  return WorkletsModule.createCustomSerializable(
    serialized,
    typeId
  ) as SerializableRef<TValue>;
}

function inaccessibleObject<TValue extends object>(
  value: TValue
): SerializableRef<TValue> {
  // This is reached for object types that are not of plain Object.prototype.
  // We don't support such objects from being transferred as serializables to
  // the UI runtime and hence we replace them with "inaccessible object"
  // which is implemented as a Proxy object that throws on any attempt
  // of accessing its fields. We argue that such objects can sometimes leak
  // as attributes of objects being captured by worklets but should never
  // be used on the UI runtime regardless. If they are being accessed, the user
  // will get an appropriate error message.
  const clone = createSerializable<TValue>(INACCESSIBLE_OBJECT as TValue);
  serializableMappingCache.set(value, clone);
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

type RemoteFunction<TValue> = {
  __remoteFunction: FlatSerializableRef<TValue>;
};

function isRemoteFunction<TValue>(value: {
  __remoteFunction?: unknown;
}): value is RemoteFunction<TValue> {
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
function freezeObjectInDev<TValue extends object>(value: TValue) {
  if (!__DEV__ || globalThis.__RUNTIME_KIND !== RuntimeKind.ReactNative) {
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
        https://docs.swmansion.com/react-native-reanimated/docs/guides/troubleshooting#tried-to-modify-key-of-an-object-which-has-been-converted-to-a-serializable
        for more details.`
        );
      },
    });
  });
  Object.preventExtensions(value);
}

function makeShareableCloneOnUIRecursiveLEGACY<TValue>(
  value: TValue
): FlatSerializableRef<TValue> {
  'worklet';
  // eslint-disable-next-line @typescript-eslint/no-shadow
  function cloneRecursive(value: TValue): FlatSerializableRef<TValue> {
    if (
      (typeof value === 'object' && value !== null) ||
      typeof value === 'function'
    ) {
      if (isHostObject(value)) {
        // We call `_createSerializableClone` to wrap the provided HostObject
        // inside SerializableJSRef.
        return global._createSerializableHostObject(
          value
        ) as FlatSerializableRef<TValue>;
      }
      if (isRemoteFunction<TValue>(value)) {
        // RemoteFunctions are created by us therefore they are
        // a Serializable out of the box and there is no need to
        // call `_createSerializableClone`.
        return value.__remoteFunction;
      }
      if (Array.isArray(value)) {
        return global._createSerializableArray(
          value.map(cloneRecursive)
        ) as FlatSerializableRef<TValue>;
      }
      if ((value as Record<string, unknown>).__synchronizableRef) {
        return global._createSerializableSynchronizable(
          value
        ) as FlatSerializableRef<TValue>;
      }
      if (Object.getPrototypeOf(value) !== Object.prototype) {
        const length = globalThis.__customSerializationRegistry.length;
        for (let i = 0; i < length; i++) {
          const { determine, pack } =
            globalThis.__customSerializationRegistry[i];
          if (determine(value)) {
            const packedData = pack(value);
            return globalThis.__workletsModuleProxy?.createCustomSerializable(
              cloneRecursive(packedData as TValue) as SerializableRef<object>,
              i
            ) as FlatSerializableRef<TValue>;
          }
        }
      }
      const toAdapt: Record<string, FlatSerializableRef<TValue>> = {};
      for (const [key, element] of Object.entries(value)) {
        toAdapt[key] = cloneRecursive(element);
      }
      return global._createSerializable(
        toAdapt,
        value
      ) as FlatSerializableRef<TValue>;
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
export const makeShareableCloneOnUIRecursive = (
  globalThis._WORKLETS_BUNDLE_MODE
    ? createSerializable
    : makeShareableCloneOnUIRecursiveLEGACY
) as typeof makeShareableCloneOnUIRecursiveLEGACY;

/**
 * This function creates a value on UI with persistent state - changes to it on
 * the UI thread will be seen by all worklets. Use it when you want to create a
 * value that is read and written only on the UI thread.
 *
 * @deprecated This function is no longer supported.
 */
export function makeShareable<TValue extends object>(value: TValue): TValue {
  if (serializableMappingCache.get(value)) {
    return value;
  }
  const handle = createSerializable({
    __init: () => {
      'worklet';
      return value;
    },
  });
  serializableMappingCache.set(value, handle);
  return value;
}
