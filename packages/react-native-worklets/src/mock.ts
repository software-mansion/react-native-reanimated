'use strict';

import { NOOP } from './common';
import { RuntimeKind } from './runtimeKind';

const IMMEDIATE_CALLBACK_INVOCATION = (
  _runtimeOrWorklet: unknown,
  workletOrUndefined?: (...args: unknown[]) => unknown
) => {
  if (typeof _runtimeOrWorklet === 'function') {
    _runtimeOrWorklet();
  }
  if (typeof workletOrUndefined === 'function') {
    workletOrUndefined();
  }
};

const mockedRequestAnimationFrame = (callback: () => void) => {
  return setTimeout(callback, 16); // 60 fps -> 16.6 ms
};

/**
 * JS-only mock of the Worklets public API for Jest and Node environments.
 *
 * `packages/react-native-worklets/src/index.ts` is the single source of truth
 * for the public API surface.
 */
const WorkletAPI = {
  createSerializable: (value: unknown) => value,
  createSynchronizable: (value: unknown) => value,
  createWorkletRuntime: (
    name?: string,
    initializer?: () => void,
    _useDefaultQueue?: boolean,
    _customQueue?: object,
    _enableEventLoop?: boolean,
    _enableLocking?: boolean,
    _enableNetworking?: boolean
  ) => {
    initializer?.();
    return { name };
  },
  getDynamicFeatureFlag: () => false,
  getStaticFeatureFlag: () => false,
  isClonable: () => false,
  isCustomSerializable: () => false,
  isRemoteFunction: () => false,
  isSerializable: () => false,
  isSynchronizable: () => false,
  isWorkletFunction: () => false,
  makeShareable: (value: unknown) => value,
  makeShareableCloneRecursive: (value: unknown) => value,
  registerCustomSerializable: NOOP,
  runOnJS<Args extends unknown[], ReturnValue>(
    fun: (...args: Args) => ReturnValue
  ): (...args: Args) => void {
    return (...args) => {
      fun(...args);
    };
  },
  runOnRuntime<Args extends unknown[], ReturnValue>(
    _workletRuntime: unknown,
    worklet: (...args: Args) => ReturnValue
  ): (...args: Args) => void {
    return (...args) => {
      worklet(...args);
    };
  },
  runOnRuntimeAsync<Args extends unknown[], ReturnValue>(
    _workletRuntime: unknown,
    worklet: (...args: Args) => ReturnValue,
    ...args: Args
  ): Promise<ReturnValue> {
    return WorkletAPI.runOnUIAsync(worklet, ...args);
  },
  runOnRuntimeAsyncWithId<Args extends unknown[], ReturnValue>(
    _runtimeId: number,
    worklet: (...args: Args) => ReturnValue,
    ...args: Args
  ): Promise<ReturnValue> {
    return WorkletAPI.runOnUIAsync(worklet, ...args);
  },
  runOnRuntimeSync<Args extends unknown[], ReturnValue>(
    _workletRuntime: unknown,
    worklet: (...args: Args) => ReturnValue,
    ...args: Args
  ): ReturnValue {
    return worklet(...args);
  },
  runOnRuntimeSyncWithId<Args extends unknown[], ReturnValue>(
    _runtimeId: number,
    worklet: (...args: Args) => ReturnValue,
    ...args: Args
  ): ReturnValue {
    return worklet(...args);
  },
  runOnUI<Args extends unknown[], ReturnValue>(
    worklet: (...args: Args) => ReturnValue
  ): (...args: Args) => void {
    return (...args) => {
      // Mocking time in Jest is tricky as both requestAnimationFrame and queueMicrotask
      // callbacks run on the same queue and can be interleaved. There is no way
      // to flush particular queue in Jest and the only control over mocked timers
      // is by using jest.advanceTimersByTime() method which advances all types
      // of timers including immediate and animation callbacks. Ideally we'd like
      // to have some way here to schedule work along with React updates, but
      // that's not possible, and hence in Jest environment instead of using scheduling
      // mechanism we just schedule the work ommiting the queue. This is ok for the
      // uses that we currently have but may not be ok for future tests that we write.
      mockedRequestAnimationFrame(() => {
        worklet(...args);
      });
    };
  },
  runOnUIAsync<Args extends unknown[], ReturnValue>(
    worklet: (...args: Args) => ReturnValue,
    ...args: Args
  ): Promise<ReturnValue> {
    return new Promise<ReturnValue>((resolve) => {
      mockedRequestAnimationFrame(() => {
        const result = worklet(...args);
        resolve(result);
      });
    });
  },
  runOnUISync: IMMEDIATE_CALLBACK_INVOCATION,
  RuntimeKind: RuntimeKind,
  scheduleOnRN<Args extends unknown[], ReturnValue>(
    fun: (...args: Args) => ReturnValue,
    ...args: Args
  ): void {
    WorkletAPI.runOnJS(fun)(...args);
  },
  scheduleOnRuntime: IMMEDIATE_CALLBACK_INVOCATION,
  scheduleOnRuntimeWithId<Args extends unknown[], ReturnValue>(
    _runtimeId: number,
    worklet: (...args: Args) => ReturnValue,
    ...args: Args
  ): void {
    WorkletAPI.scheduleOnUI(worklet, ...args);
  },
  scheduleOnUI<Args extends unknown[], ReturnValue>(
    worklet: (...args: Args) => ReturnValue,
    ...args: Args
  ): void {
    WorkletAPI.runOnUI(worklet)(...args);
  },
  serializableMappingCache: new Map(),
  setDynamicFeatureFlag: NOOP,
  shareableMappingCache: new Map(),
  toggleSlowAnimationsOnUIRuntime: () => false,
  UIRuntimeId: RuntimeKind.UI,
  WorkletsModule: {
    propagateModuleUpdate: NOOP,
  },
};

module.exports = {
  __esModule: true,
  ...WorkletAPI,
};
