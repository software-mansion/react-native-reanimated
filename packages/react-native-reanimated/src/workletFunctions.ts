import type { WorkletRuntime as WorkletRuntimeFromWorklets } from 'react-native-worklets';
import {
  createWorkletRuntime as createWorkletRuntimeFromWorklets,
  executeOnUIRuntimeSync as executeOnUIRuntimeSyncFromWorklets,
  isWorkletFunction as isWorkletFunctionFromWorklets,
  makeShareableCloneRecursive as makeShareableCloneRecursiveFromWorklets,
  runOnJS as runOnJSFromWorklets,
  runOnRuntime as runOnRuntimeFromWorklets,
  runOnUI as runOnUIFromWorklets,
} from 'react-native-worklets';
import type { MakeShareableClone } from 'react-native-worklets/lib/typescript/shareables';

/**
 * @deprecated This function is deprecated and will be removed in the next major
 *   Please import `makeShareableCloneRecursive` directly from
 *   `react-native-worklets` instead of `react-native-reanimated`.
 */
export const makeShareableCloneRecursive: MakeShareableClone =
  makeShareableCloneRecursiveFromWorklets;

/**
 * @deprecated This function is deprecated and will be removed in the next major
 *   Please import `createWorkletRuntime` directly from `react-native-worklets`
 *   instead of `react-native-reanimated`.
 */
export const createWorkletRuntime = createWorkletRuntimeFromWorklets;

/**
 * @deprecated This function is deprecated and will be removed in the next major
 *   Please import `executeOnUIRuntimeSync` directly from
 *   `react-native-worklets` instead of `react-native-reanimated`.
 */
export const executeOnUIRuntimeSync = executeOnUIRuntimeSyncFromWorklets;

/**
 * @deprecated This function is deprecated and will be removed in the next major
 *   Please import `runOnJS` directly from `react-native-worklets` instead of
 *   `react-native-reanimated`.
 */
export const runOnJS = runOnJSFromWorklets;

/**
 * @deprecated This function is deprecated and will be removed in the next major
 *   Please import `runOnUI` directly from `react-native-worklets` instead of
 *   `react-native-reanimated`.
 */
export const runOnUI = runOnUIFromWorklets;

/**
 * @deprecated This function is deprecated and will be removed in the next major
 *   Please import `runOnRuntime` directly from `react-native-worklets` instead
 *   of `react-native-reanimated`.
 */
export const runOnRuntime = runOnRuntimeFromWorklets;

/**
 * @deprecated This type is deprecated and will be removed in the next major
 *   Please import `WorkletRuntime` directly from `react-native-worklets`
 *   instead of `react-native-reanimated`.
 */
export type WorkletRuntime = WorkletRuntimeFromWorklets;

/**
 * @deprecated This function is deprecated and will be removed in the next major
 *   Please import `isWorkletFunction` directly from `react-native-worklets`
 *   instead of `react-native-reanimated`.
 */
export const isWorkletFunction = isWorkletFunctionFromWorklets;
