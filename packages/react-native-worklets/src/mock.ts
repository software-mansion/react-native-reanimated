'use strict';

import { mockedRequestAnimationFrame } from './runLoop/uiRuntime/mockedRequestAnimationFrame';
import { RuntimeKind } from './runtimeKind';
import { isWorkletFunction } from './workletFunction';

const NOOP = () => {};
const NOOP_FACTORY = () => NOOP;
const ID = <TValue>(value: TValue) => value;
const IMMEDIATE_CALLBACK_INVOCATION = <TCallback>(callback: () => TCallback) =>
  callback();

globalThis._WORKLET = false;
globalThis.__RUNTIME_KIND = RuntimeKind.ReactNative;
globalThis._log = console.log;
globalThis._getAnimationTimestamp = () => performance.now();
// requestAnimationFrame react-native jest's setup is incorrect as it polyfills
// the method directly using setTimeout, therefore the callback doesn't get the
// expected timestamp as the only argument: https://github.com/facebook/react-native/blob/main/packages/react-native/jest/setup.js#L28
// We override this setup here to make sure that callbacks get the proper timestamps
// when executed. For non-jest environments we define requestAnimationFrame in setupRequestAnimationFrame
// @ts-ignore TypeScript uses Node definition for rAF, setTimeout, etc which returns a Timeout object rather than a number
globalThis.requestAnimationFrame = mockedRequestAnimationFrame;

const WorkletAPI = {
  isShareableRef: () => true,
  makeShareable: ID,
  makeShareableCloneOnUIRecursive: ID,
  makeShareableCloneRecursive: ID,
  shareableMappingCache: new Map(),
  getStaticFeatureFlag: () => false,
  setDynamicFeatureFlag: NOOP,
  isSynchronizable: () => false,
  getRuntimeKind: () => RuntimeKind.ReactNative,
  RuntimeKind: RuntimeKind,
  createWorkletRuntime: NOOP_FACTORY,
  runOnRuntime: ID,
  scheduleOnRuntime: IMMEDIATE_CALLBACK_INVOCATION,
  createSerializable: ID,
  isSerializableRef: ID,
  serializableMappingCache: new Map(),
  createSynchronizable: ID,
  callMicrotasks: NOOP,
  executeOnUIRuntimeSync: ID,
  runOnJS<Args extends unknown[], ReturnValue>(
    fun: (...args: Args) => ReturnValue
  ): (...args: Args) => void {
    return (...args) =>
      queueMicrotask(
        args.length
          ? () => (fun as (...args: Args) => ReturnValue)(...args)
          : (fun as () => ReturnValue)
      );
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
    worklet: (...args: Args) => ReturnValue
  ): (...args: Args) => Promise<ReturnValue> {
    return (...args: Args) => {
      return new Promise<ReturnValue>((resolve) => {
        mockedRequestAnimationFrame(() => {
          const result = worklet(...args);
          resolve(result);
        });
      });
    };
  },
  runOnUISync: IMMEDIATE_CALLBACK_INVOCATION,
  scheduleOnRN<Args extends unknown[], ReturnValue>(
    fun: (...args: Args) => ReturnValue,
    ...args: Args
  ): void {
    WorkletAPI.runOnJS(fun)(...args);
  },
  scheduleOnUI<Args extends unknown[], ReturnValue>(
    worklet: (...args: Args) => ReturnValue,
    ...args: Args
  ): void {
    WorkletAPI.runOnUI(worklet)(...args);
  },
  // eslint-disable-next-line camelcase
  unstable_eventLoopTask: NOOP_FACTORY,
  isWorkletFunction: isWorkletFunction,
  WorkletsModule: {},
};

module.exports = {
  __esModule: true,
  ...WorkletAPI,
};
