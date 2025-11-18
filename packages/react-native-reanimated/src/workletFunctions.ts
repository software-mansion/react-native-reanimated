'use strict';

import type {
  MakeShareableClone,
  WorkletRuntime as WorkletRuntimeFromWorklets,
} from 'react-native-worklets';
import {
  createSerializable,
  createWorkletRuntime as createWorkletRuntimeFromWorklets,
  executeOnUIRuntimeSync as executeOnUIRuntimeSyncFromWorklets,
  isWorkletFunction as isWorkletFunctionFromWorklets,
  runOnJS as runOnJSFromWorklets,
  runOnRuntime as runOnRuntimeFromWorklets,
  runOnUI as runOnUIFromWorklets,
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
export const makeShareableCloneRecursive: MakeShareableClone =
  createSerializable;

/**
 * @deprecated Please import [`createWorkletRuntime` directly from
 *   `react-native-worklets`](https://docs.swmansion.com/react-native-worklets/docs/threading/createWorkletRuntime/)
 *   instead of `react-native-reanimated`.
 */
export const createWorkletRuntime = createWorkletRuntimeFromWorklets;

/**
 * @deprecated Please use [`runOnUISync` from
 *   `react-native-worklets`](https://docs.swmansion.com/react-native-worklets/docs/threading/scheduleOnRN/)
 *   instead.
 *
 *   See the [migration
 *   guide](https://docs.swmansion.com/react-native-reanimated/docs/guides/migration-from-3.x/)
 *   for more details.
 */
export const executeOnUIRuntimeSync = executeOnUIRuntimeSyncFromWorklets;

/**
 * @deprecated Please use [`scheduleOnRN` from
 *   `react-native-worklets`](https://docs.swmansion.com/react-native-worklets/docs/threading/scheduleOnRN/)
 *   instead.
 *
 *   See the [migration
 *   guide](https://docs.swmansion.com/react-native-reanimated/docs/guides/migration-from-3.x/)
 *   for more details.
 */
export const runOnJS = runOnJSFromWorklets;

/**
 * @deprecated Please use [`scheduleOnUI` from
 *   `react-native-worklets`](https://docs.swmansion.com/react-native-worklets/docs/threading/scheduleOnUI/)
 *   instead.
 *
 *   See the [migration
 *   guide](https://docs.swmansion.com/react-native-reanimated/docs/guides/migration-from-3.x/)
 *   for more details.
 */
export const runOnUI = runOnUIFromWorklets;

/**
 * @deprecated Please use [`scheduleOnRuntime` from
 *   `react-native-worklets`](https://docs.swmansion.com/react-native-worklets/docs/threading/scheduleOnRuntime/)
 *   instead.
 *
 *   See the [migration
 *   guide](https://docs.swmansion.com/react-native-reanimated/docs/guides/migration-from-3.x/)
 *   for more details.
 */
export const runOnRuntime = runOnRuntimeFromWorklets;

/**
 * @deprecated Please import `WorkletRuntime` directly from
 *   `react-native-worklets` instead of `react-native-reanimated`.
 */
export type WorkletRuntime = WorkletRuntimeFromWorklets;

/**
 * @deprecated Please import [`isWorkletFunction` directly from
 *   `react-native-worklets`](https://docs.swmansion.com/react-native-worklets/docs/threading/isWorkletFunction/)
 *   instead of `react-native-reanimated`.
 */
export const isWorkletFunction = isWorkletFunctionFromWorklets;
