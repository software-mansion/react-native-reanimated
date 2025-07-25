/* eslint-disable reanimated/use-global-this */
'use strict';

// This file works by accident - currently Builder Bob doesn't move `.d.ts` files to output types.
// If it ever breaks, we should address it so we'd not pollute the user's global namespace.
import type { callGuardDEV } from './callGuard';
import type { reportFatalRemoteError } from './errors';
import type { IWorkletsErrorConstructor } from './WorkletsError';
import type { WorkletsModuleProxy } from './WorkletsModule';
import type { ValueUnpacker } from './workletTypes';

declare global {
  /** The only runtime-available require method is `__r` defined by Metro. */
  var __r: ((moduleId: number) => Record<string, unknown>) &
    Record<string, unknown>;
  var __workletsCache: Map<number, () => unknown>;
  var __handleCache: WeakMap<object, unknown>;
  var evalWithSourceMap:
    | ((js: string, sourceURL: string, sourceMap: string) => () => unknown)
    | undefined;
  var evalWithSourceUrl:
    | ((js: string, sourceURL: string) => () => unknown)
    | undefined;
  var _toString: (value: unknown) => string;
  var __workletsModuleProxy: WorkletsModuleProxy | undefined;
  var _WORKLET: boolean | undefined;
  var _WORKLETS_BUNDLE_MODE: boolean | undefined;
  var _WORKLETS_VERSION_CPP: string | undefined;
  var _WORKLETS_VERSION_JS: string | undefined;
  var _makeShareableClone: <T>(
    value: T,
    nativeStateSource?: object
  ) => FlatShareableRef<T>;
  var _makeShareableString: (value: string) => FlatShareableRef<string>;
  var _makeShareableNumber: (value: number) => FlatShareableRef<number>;
  var _makeShareableBoolean: (value: boolean) => FlatShareableRef<boolean>;
  var _makeShareableBigInt: (value: bigint) => FlatShareableRef<bigint>;
  var _makeShareableUndefined: () => FlatShareableRef<undefined>;
  var _makeShareableNull: () => FlatShareableRef<null>;
  var _makeShareableObject: <T extends object>(
    value: T,
    shouldRetainRemote: boolean,
    nativeStateSource?: object
  ) => FlatShareableRef<T>;
  var _makeShareableHostObject: <T extends object>(
    value: T
  ) => FlatShareableRef<T>;
  var _makeShareableWorklet: (
    value: object,
    shouldPersistRemote: boolean
  ) => FlatShareableRef<object>;
  var _makeShareableArray: (value: unknown[]) => FlatShareableRef<unknown[]>;
  var _makeShareableInitializer: (value: object) => FlatShareableRef<object>;
  var __callMicrotasks: () => void;
  var _scheduleHostFunctionOnJS: (fun: (...args: A) => R, args?: A) => void;
  var _scheduleRemoteFunctionOnJS: (fun: (...args: A) => R, args?: A) => void;
  /** Available only on RN Runtime */
  var __reportFatalRemoteError: typeof reportFatalRemoteError | undefined;
  var __valueUnpacker: ValueUnpacker;
  var __callGuardDEV: typeof callGuardDEV | undefined;
  var __flushAnimationFrame: (timestamp: number) => void;
  var __frameTimestamp: number | undefined;
  var _log: (value: unknown) => void;
  var _getAnimationTimestamp: () => number;
  var _scheduleOnRuntime: (
    runtime: WorkletRuntime,
    worklet: ShareableRef<() => void>
  ) => void;
  var _microtaskQueueFinalizers: (() => void)[];
  var WorkletsError: IWorkletsErrorConstructor;
}
