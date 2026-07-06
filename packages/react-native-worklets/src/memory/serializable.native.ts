'use strict';

import { registerWorkletStackDetails } from '../debug/errors';
import { jsVersion } from '../debug/jsVersion';
import { logger } from '../debug/logger';
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
  RemoteFunction,
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

/**
 * RN has introduced a new representation of TurboModules as a JS object whose
 * prototype is the host object. More details:
 * https://github.com/facebook/react-native/blob/main/packages/react-native/ReactCommon/react/nativemodule/core/ReactCommon/TurboModuleBinding.cpp#L182
 */
function isTurboModuleLike(object: object): object is Record<string, unknown> {
  const proto = Object.getPrototypeOf(object);
  return proto !== null && isHostObject(proto);
}

function getFromCache(value: object) {
  const cached = serializableMappingCache.get(value);
  if (cached === serializableMappingFlag) {
    // This means that `value` was already a clone and we should return it as is.
    return value;
  }
  return cached;
}

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

  if (typeof value === 'symbol') {
    return cloneString(String(value)) as SerializableRef<TValue>;
  }

  if (value === undefined) {
    return cloneUndefined() as SerializableRef<TValue>;
  }

  if (value === null) {
    return cloneNull() as SerializableRef<TValue>;
  }

  const cached = getFromCache(value);
  if (cached !== undefined) {
    if (globalThis.WeakRef && cached instanceof WeakRef) {
      // WeakRef is installed on runtimes only with Hermes microtaskQueue enabled.
      const deref = cached.deref();
      if (deref !== undefined) {
        return deref as SerializableRef<TValue>;
      }
    } else {
      return cached as SerializableRef<TValue>;
    }
  }

  if (Array.isArray(value)) {
    return cloneArray(value, shouldPersistRemote, depth);
  }
  if (isFunction) {
    if (globalThis._WORKLETS_BUNDLE_MODE_ENABLED) {
      if ((value as unknown as WorkletImport).__bundleData) {
        return cloneImport(
          value as unknown as WorkletImport
        ) as SerializableRef<TValue>;
      }
    }
    if ((value as unknown as RemoteFunction).__remoteFunction) {
      // Remote functions are already serialized.
      return value as unknown as SerializableRef<TValue>;
    }
    if (!isWorkletFunction(value)) {
      return cloneNonWorkletFunction(
        value as () => unknown
      ) as SerializableRef<TValue>;
    }
  }
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
    return cloneSet(value) as SerializableRef<TValue>;
  }
  if (value instanceof Map) {
    return cloneMap(value) as SerializableRef<TValue>;
  }
  if (value instanceof RegExp) {
    return cloneRegExp(value) as SerializableRef<TValue>;
  }
  if (value instanceof Error) {
    return cloneError(value) as SerializableRef<TValue>;
  }
  if (value instanceof ArrayBuffer) {
    return cloneArrayBuffer(value) as SerializableRef<TValue>;
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

  return cloneUndefined() as SerializableRef<TValue>;
}

if (globalThis._WORKLETS_BUNDLE_MODE_ENABLED) {
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
    throw new Error(
      '[Worklets] registerCustomSerializable can be used only on React Native runtime.'
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
    throw new Error(
      '[Worklets] The "determine" function provided to registerCustomSerializable must be a worklet.'
    );
  }
  if (!isWorkletFunction(pack)) {
    throw new Error(
      '[Worklets] The "pack" function provided to registerCustomSerializable must be a worklet.'
    );
  }
  if (!isWorkletFunction(unpack)) {
    throw new Error(
      '[Worklets] The "unpack" function provided to registerCustomSerializable must be a worklet.'
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
      throw new Error(
        '[Worklets] Trying to convert a cyclic object to a serializable. This is not supported.'
      );
    }
  } else {
    processedObjectAtThresholdDepth = undefined;
  }
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

function cloneNonWorkletFunction<TArgs extends unknown[], TReturn>(
  fun: (...args: TArgs) => TReturn
): SerializableRef<(...args: TArgs) => TReturn> {
  const clone = WorkletsModule.createSerializableNonWorkletFunction(
    fun,
    __DEV__ ? fun.name : undefined
  ) as SerializableRef<(...args: TArgs) => TReturn>;

  if (globalThis.WeakRef) {
    // WeakRef is installed on runtimes only with Hermes microtaskQueue enabled.
    serializableMappingCache.set(fun, new WeakRef(clone));
    serializableMappingCache.set(clone);
    freezeObjectInDev(fun);
  }

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
      throw new Error(
        `[Worklets] Mismatch between JavaScript code version and Worklets Babel plugin version (${jsVersion} vs. ${babelVersion}).
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
    shouldPersistRemote,
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

function cloneMap(
  value: Map<unknown, unknown>
): SerializableRef<Map<unknown, unknown>> {
  const clonedKeys: unknown[] = [];
  const clonedValues: unknown[] = [];
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

function cloneSet(value: Set<unknown>): SerializableRef<Set<unknown>> {
  const clonedElements: unknown[] = [];
  for (const element of value) {
    clonedElements.push(createSerializable(element));
  }
  const clone = WorkletsModule.createSerializableSet(clonedElements);
  serializableMappingCache.set(value, clone);
  serializableMappingCache.set(clone);

  freezeObjectInDev(value);
  return clone;
}

function cloneRegExp(value: RegExp): SerializableRef<RegExp> {
  const clone = WorkletsModule.createSerializableRegExp(
    value.source,
    value.flags
  );
  serializableMappingCache.set(value, clone);
  return clone;
}

function cloneError(value: Error): SerializableRef<Error> {
  const { name, message, stack } = value;
  const clone = WorkletsModule.createSerializableError(name, message, stack);
  serializableMappingCache.set(value, clone);
  return clone;
}

function cloneArrayBuffer(
  arrayBuffer: ArrayBuffer
): SerializableRef<ArrayBuffer> {
  const clone = WorkletsModule.createSerializableArrayBuffer(arrayBuffer);
  serializableMappingCache.set(arrayBuffer, clone);
  serializableMappingCache.set(clone);

  return clone;
}

function cloneArrayBufferView<TValue extends ArrayBufferView>(
  value: TValue
): SerializableRef<TValue> {
  const typeName = value.constructor.name;
  if (!VALID_ARRAY_VIEWS_NAMES.includes(typeName)) {
    throw new Error(`[Worklets] Invalid array view name \`${typeName}\`.`);
  }
  const length =
    typeName === 'DataView'
      ? value.byteLength
      : (value as unknown as { length: number }).length;
  const clone = WorkletsModule.createSerializableArrayBufferView<TValue>(
    typeName,
    value.buffer as ArrayBuffer,
    value.byteOffset,
    length
  );
  serializableMappingCache.set(value, clone);
  return clone;
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
        return globalThis._createSerializableHostObject(
          value
        ) as FlatSerializableRef<TValue>;
      }
      if ((value as Record<string, unknown>).__remoteFunction) {
        // RemoteFunctions are created by us therefore they are
        // a Serializable out of the box and there is no need to
        // call `_createSerializableClone`.
        return value as FlatSerializableRef<TValue>;
      }
      if (Array.isArray(value)) {
        return globalThis._createSerializableArray(
          value.map(cloneRecursive)
        ) as FlatSerializableRef<TValue>;
      }
      if ((value as Record<string, unknown>).__synchronizableRef) {
        return globalThis._createSerializableSynchronizable(
          value
        ) as FlatSerializableRef<TValue>;
      }
      if ((value as Record<string, unknown>).__serializableRef) {
        return value as FlatSerializableRef<TValue>;
      }
      if (value instanceof Set) {
        const values: unknown[] = [];
        value.forEach((element) => {
          values.push(cloneRecursive(element));
        });
        return globalThis.__workletsModuleProxy.createSerializableSet(
          values
        ) as FlatSerializableRef<TValue>;
      }
      if (value instanceof Error) {
        const { name, message, stack } = value;
        return globalThis.__workletsModuleProxy.createSerializableError(
          name,
          message,
          stack
        ) as FlatSerializableRef<TValue>;
      }
      if (value instanceof RegExp) {
        return globalThis.__workletsModuleProxy.createSerializableRegExp(
          value.source,
          value.flags
        ) as FlatSerializableRef<TValue>;
      }
      if (value instanceof ArrayBuffer) {
        return globalThis.__workletsModuleProxy.createSerializableArrayBuffer(
          value
        ) as FlatSerializableRef<TValue>;
      }
      if (ArrayBuffer.isView(value)) {
        const typeName = value.constructor.name;
        if (!VALID_ARRAY_VIEWS_NAMES.includes(typeName)) {
          throw new Error(
            `[Worklets] Invalid array view name \`${typeName}\`.`
          );
        }
        const length =
          typeName === 'DataView'
            ? value.byteLength
            : (value as unknown as { length: number }).length;
        return globalThis.__workletsModuleProxy.createSerializableArrayBufferView(
          typeName,
          value.buffer as ArrayBuffer,
          value.byteOffset,
          length
        ) as FlatSerializableRef<TValue>;
      }
      if (value instanceof Map) {
        const keys: unknown[] = [];
        const values: unknown[] = [];
        value.forEach((element, key) => {
          keys.push(cloneRecursive(key));
          values.push(cloneRecursive(element));
        });
        return globalThis.__workletsModuleProxy.createSerializableMap(
          keys,
          values
        ) as FlatSerializableRef<TValue>;
      }
      if (Object.getPrototypeOf(value) !== Object.prototype) {
        const length = globalThis.__customSerializationRegistry.length;
        for (let i = 0; i < length; i++) {
          const { determine, pack } =
            globalThis.__customSerializationRegistry[i];
          if (determine(value)) {
            const packedData = pack(value);
            return globalThis.__workletsModuleProxy.createCustomSerializable(
              cloneRecursive(packedData as TValue) as SerializableRef<object>,
              i
            ) as FlatSerializableRef<TValue>;
          }
        }
      }
      if (__DEV__ && value instanceof Promise) {
        throw new Error(
          '[Worklets] Promises cannot be converted to serializable.'
        );
      }
      const toAdapt: Record<string, FlatSerializableRef<TValue>> = {};
      for (const [key, element] of Object.entries(value)) {
        toAdapt[key] = cloneRecursive(element);
      }
      return globalThis.__workletsModuleProxy.createSerializableLEGACY(
        toAdapt,
        value
      ) as FlatSerializableRef<TValue>;
    }

    if (typeof value === 'string') {
      return globalThis._createSerializableString(value);
    }

    if (typeof value === 'number') {
      return globalThis._createSerializableNumber(value);
    }

    if (typeof value === 'boolean') {
      return globalThis._createSerializableBoolean(value);
    }

    if (typeof value === 'bigint') {
      return globalThis._createSerializableBigInt(value);
    }

    if (typeof value === 'symbol') {
      // TODO: add native support
      return globalThis._createSerializableString(
        String(value)
      ) as FlatSerializableRef<TValue>;
    }

    if (value === undefined) {
      return globalThis._createSerializableUndefined();
    }

    if (value === null) {
      return globalThis._createSerializableNull();
    }

    return globalThis.__workletsModuleProxy.createSerializableLEGACY(
      value,
      undefined
    ) as FlatSerializableRef<TValue>;
  }
  return cloneRecursive(value);
}

/** @deprecated This function is no longer supported. */
export const makeShareableCloneOnUIRecursive = (
  globalThis._WORKLETS_BUNDLE_MODE_ENABLED
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
