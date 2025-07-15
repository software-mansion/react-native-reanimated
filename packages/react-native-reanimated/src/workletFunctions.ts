'use strict';

import type {
  MakeShareableClone,
  WorkletRuntime as WorkletRuntimeFromWorklets,
} from 'react-native-worklets';
import {
  createWorkletRuntime as createWorkletRuntimeFromWorklets,
  executeOnUIRuntimeSync as executeOnUIRuntimeSyncFromWorklets,
  isWorkletFunction as isWorkletFunctionFromWorklets,
  makeShareableCloneRecursive as makeShareableCloneRecursiveFromWorklets,
  runOnJS as runOnJSFromWorklets,
  runOnRuntime as runOnRuntimeFromWorklets,
  runOnUI as runOnUIFromWorklets,
} from 'react-native-worklets';

/**
 * @deprecated Please import `makeShareableCloneRecursive` directly from
 *   `react-native-worklets` instead of `react-native-reanimated`.
 */
export const makeShareableCloneRecursive: MakeShareableClone =
  makeShareableCloneRecursiveFromWorklets;

/**
 * @deprecated Please import `createWorkletRuntime` directly from
 *   `react-native-worklets` instead of `react-native-reanimated`.
 */
export const createWorkletRuntime = createWorkletRuntimeFromWorklets;

/**
 * @deprecated Please import `executeOnUIRuntimeSync` directly from
 *   `react-native-worklets` instead of `react-native-reanimated`.
 */
export const executeOnUIRuntimeSync = executeOnUIRuntimeSyncFromWorklets;

/**
 * @deprecated Please import `runOnJS` directly from `react-native-worklets`
 *   instead of `react-native-reanimated`.
 */
export const runOnJS = runOnJSFromWorklets;

/**
 * @deprecated Please import `runOnUI` directly from `react-native-worklets`
 *   instead of `react-native-reanimated`.
 */
export const runOnUI = runOnUIFromWorklets;

/**
 * @deprecated Please import `runOnRuntime` directly from
 *   `react-native-worklets` instead of `react-native-reanimated`.
 */
export const runOnRuntime = runOnRuntimeFromWorklets;

/**
 * @deprecated Please import `WorkletRuntime` directly from
 *   `react-native-worklets` instead of `react-native-reanimated`.
 */
export type WorkletRuntime = WorkletRuntimeFromWorklets;

/**
 * @deprecated Please import `isWorkletFunction` directly from
 *   `react-native-worklets` instead of `react-native-reanimated`.
 */
export const isWorkletFunction = isWorkletFunctionFromWorklets;
