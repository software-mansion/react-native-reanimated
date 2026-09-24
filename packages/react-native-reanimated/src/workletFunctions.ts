'use strict';

import type {
  createWorkletRuntime as createWorkletRuntimeFromWorklets,
  executeOnUIRuntimeSync as executeOnUIRuntimeSyncFromWorklets,
  isWorkletFunction as isWorkletFunctionFromWorklets,
  MakeShareableClone,
  runOnJS as runOnJSFromWorklets,
  runOnRuntime as runOnRuntimeFromWorklets,
  runOnUI as runOnUIFromWorklets,
  WorkletRuntime as WorkletRuntimeFromWorklets,
} from 'react-native-worklets';

/**
 * @deprecated Please use [`createSerializable` from
 *   `react-native-worklets`](https://docs.swmansion.com/react-native-worklets/docs/memory/createSerializable/)
 *   instead.
 *
 *   See the [migration
 *   guide](https://docs.swmansion.com/react-native-reanimated/docs/guides/migration-from-3.x/)
 *   for more details.
 */
export const makeShareableCloneRecursive = (<TValue>(value: TValue) =>
  value) as MakeShareableClone;

/**
 * @deprecated Please import [`createWorkletRuntime` directly from
 *   `react-native-worklets`](https://docs.swmansion.com/react-native-worklets/docs/threading/createWorkletRuntime/)
 *   instead of `react-native-reanimated`.
 */
export const createWorkletRuntime: typeof createWorkletRuntimeFromWorklets =
  () => {
    throw new Error(
      '[Reanimated] `createWorkletRuntime` is not supported on web.'
    );
  };

/**
 * @deprecated Please use [`runOnUISync` from
 *   `react-native-worklets`](https://docs.swmansion.com/react-native-worklets/docs/threading/scheduleOnRN/)
 *   instead.
 *
 *   See the [migration
 *   guide](https://docs.swmansion.com/react-native-reanimated/docs/guides/migration-from-3.x/)
 *   for more details.
 */
export const executeOnUIRuntimeSync: typeof executeOnUIRuntimeSyncFromWorklets =
  () => {
    throw new Error(
      '[Reanimated] `executeOnUIRuntimeSync` is not supported on web.'
    );
  };

/**
 * @deprecated Please use [`scheduleOnRN` from
 *   `react-native-worklets`](https://docs.swmansion.com/react-native-worklets/docs/threading/scheduleOnRN/)
 *   instead.
 *
 *   See the [migration
 *   guide](https://docs.swmansion.com/react-native-reanimated/docs/guides/migration-from-3.x/)
 *   for more details.
 */
export const runOnJS: typeof runOnJSFromWorklets =
  (fun) =>
  (...args) =>
    queueMicrotask(() => (fun as (...args: unknown[]) => unknown)(...args));

/**
 * @deprecated Please use [`scheduleOnUI` from
 *   `react-native-worklets`](https://docs.swmansion.com/react-native-worklets/docs/threading/scheduleOnUI/)
 *   instead.
 *
 *   See the [migration
 *   guide](https://docs.swmansion.com/react-native-reanimated/docs/guides/migration-from-3.x/)
 *   for more details.
 */
export const runOnUI: typeof runOnUIFromWorklets =
  (worklet) =>
  (...args) =>
    queueMicrotask(() => (worklet as (...args: unknown[]) => unknown)(...args));

/**
 * @deprecated Please use [`scheduleOnRuntime` from
 *   `react-native-worklets`](https://docs.swmansion.com/react-native-worklets/docs/threading/scheduleOnRuntime/)
 *   instead.
 *
 *   See the [migration
 *   guide](https://docs.swmansion.com/react-native-reanimated/docs/guides/migration-from-3.x/)
 *   for more details.
 */
export const runOnRuntime: typeof runOnRuntimeFromWorklets = () => {
  throw new Error('[Reanimated] `runOnRuntime` is not supported on web.');
};

/**
 * @deprecated Please import `WorkletRuntime` directly from
 *   `react-native-worklets` instead of `react-native-reanimated`.
 */
export type WorkletRuntime = WorkletRuntimeFromWorklets;

/**
 * @deprecated Please import [`isWorkletFunction` directly from
 *   `react-native-worklets`](https://docs.swmansion.com/react-native-worklets/docs/utility/isWorkletFunction/)
 *   instead of `react-native-reanimated`.
 */
export const isWorkletFunction: typeof isWorkletFunctionFromWorklets = ((
  value: unknown
) =>
  typeof value === 'function' &&
  !!(value as unknown as Record<string, unknown>)
    .__workletHash) as typeof isWorkletFunctionFromWorklets;
