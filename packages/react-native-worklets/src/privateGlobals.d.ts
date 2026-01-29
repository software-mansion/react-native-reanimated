'use strict';

// This file works by accident - currently Builder Bob doesn't move `.d.ts` files to output types.
// If it ever breaks, we should address it so we'd not pollute the user's global namespace.
import type { callGuardDEV } from './callGuard';
import type { reportFatalRemoteError } from './debug/errors';
import type { CustomSerializableUnpacker } from './memory/customSerializableUnpacker';
import type { makeShareableCloneOnUIRecursive } from './memory/serializable';
import type { SynchronizableUnpacker } from './memory/synchronizableUnpacker';
import type { CustomSerializationRegistry } from './memory/types';
import type { Queue } from './runLoop/workletRuntime/taskQueue';
import type { ValueUnpacker } from './types';
import type { WorkletsModuleProxy } from './WorkletsModule/workletsModuleProxy';

declare global {
  /** The only runtime-available require method is `__r` defined by Metro. */
  var __r: ((moduleId: number) => Record<string, unknown>) &
    Record<string, unknown>;

  var _toString: (value: unknown) => string;
  var __workletsModuleProxy: WorkletsModuleProxy;
  var _WORKLETS_BUNDLE_MODE: boolean | undefined;
  var _WORKLETS_VERSION_CPP: string | undefined;
  var _WORKLETS_VERSION_JS: string | undefined;
  var _createSerializable: <T>(
    value: T,
    nativeStateSource?: object
  ) => FlatSerializableRef<T>;
  var _createSerializableString: (value: string) => FlatSerializableRef<string>;
  var _createSerializableNumber: (value: number) => FlatSerializableRef<number>;
  var _createSerializableBoolean: (
    value: boolean
  ) => FlatSerializableRef<boolean>;
  var _createSerializableBigInt: (value: bigint) => FlatSerializableRef<bigint>;
  var _createSerializableUndefined: () => FlatSerializableRef<undefined>;
  var _createSerializableNull: () => FlatSerializableRef<null>;
  var _createSerializableObject: <T extends object>(
    value: T,
    shouldRetainRemote: boolean,
    nativeStateSource?: object
  ) => FlatSerializableRef<T>;
  var _createSerializableHostObject: <T extends object>(
    value: T
  ) => FlatSerializableRef<T>;
  var _createSerializableWorklet: (
    value: object,
    shouldPersistRemote: boolean
  ) => FlatSerializableRef<object>;
  var _createSerializableArray: (
    value: unknown[]
  ) => FlatSerializableRef<unknown[]>;
  var _createSerializableInitializer: (
    value: object
  ) => FlatSerializableRef<object>;
  var _createSerializableSynchronizable: (
    value: object
  ) => FlatShareableRef<object>;
  /** Only outside of Bundle Mode on Worklet Runtimes. */
  var __serializer: typeof makeShareableCloneOnUIRecursive;
  var __callMicrotasks: () => void;
  var _scheduleHostFunctionOnJS: (fun: (...args: A) => R, args?: A) => void;
  var _scheduleRemoteFunctionOnJS: (fun: (...args: A) => R, args?: A) => void;
  /** Available only on RN Runtime */
  var __reportFatalRemoteError: typeof reportFatalRemoteError | undefined;
  var __valueUnpacker: ValueUnpacker;
  var __synchronizableUnpacker: SynchronizableUnpacker;
  var __customSerializationRegistry: CustomSerializationRegistry;
  var __customSerializableUnpacker: CustomSerializableUnpacker;
  var __callGuardDEV: typeof callGuardDEV | undefined;
  var __flushAnimationFrame: (timestamp: number) => void;
  var __frameTimestamp: number | undefined;
  var _log: (value: unknown) => void;
  var _getAnimationTimestamp: () => number;
  var _scheduleOnRuntime: (
    runtime: WorkletRuntime,
    worklet: SerializableRef<() => void>
  ) => void;
  var _microtaskQueueFinalizers: (() => void)[];
  var _scheduleTimeoutCallback: (delay: number, handlerId: number) => void;
  var __runTimeoutCallback: (handlerId: number) => void;
  var __flushMicrotasks: () => void;
  var _taskQueue: Queue;
  /** Only in Debug builds. */
  var __hasNativeState: (value: object) => boolean;
  /** Only in Debug builds. */
  var __isHostObject: (value: object) => boolean;
  interface NodeRequire {
    resolveWeak(id: string): number;
    getModules(): Map<number, unknown>;
  }
}
