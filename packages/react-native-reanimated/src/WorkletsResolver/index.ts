'use strict';

// react-native-reanimated isn't allowed to import anything directly
// from `worklets` directory. Everything should be acquired through
// the `WorkletsResolver` module.

import type {
  isWorkletFunction as isWorkletFunctionType,
  IWorkletsModule,
  mockedRequestAnimationFrame as mockedRequestAnimationFrameType,
  createCustomError as createCustomErrorType,
  registerCustomError as registerCustomErrorType,
  reportFatalErrorOnJS as reportFatalErrorOnJSType,
  registerWorkletStackDetails as registerWorkletStackDetailsType,
  runOnUI as runOnUIType,
  runOnJS as runOnJSType,
  runOnUIImmediately as runOnUIImmediatelyType,
  executeOnUIRuntimeSync as executeOnUIRuntimeSyncType,
  makeShareable as makeShareableType,
  makeShareableCloneRecursive as makeShareableCloneRecursiveType,
  makeShareableCloneOnUIRecursive as makeShareableCloneOnUIRecursiveType,
  shareableMappingCache as shareableMappingCacheType,
  callMicrotasks as callMicrotasksType,
  logger as loggerType,
  updateLoggerConfig as updateLoggerConfigType,
  LogLevel as LogLevelType,
  registerLoggerConfig as registerLoggerConfigType,
  setupCallGuard as setupCallGuardType,
  setupConsole as setupConsoleType,
} from '../worklets';

import {
  // @ts-expect-error - required for resolving the module
  WorkletsModule as ResolvedWorkletsModule,
  // @ts-expect-error - required for resolving the module
  isWorkletFunction as ResolvedIsWorkletFunction,
  // @ts-expect-error - required for resolving the module
  mockedRequestAnimationFrame as ResolvedMockedRequestAnimationFrame,
  // @ts-expect-error - required for resolving the module
  createCustomError as ResolvedCreateCustomError,
  // @ts-expect-error - required for resolving the module
  registerCustomError as ResolvedRegisterCustomError,
  // @ts-expect-error - required for resolving the module
  reportFatalErrorOnJs as ResolvedReportFatalErrorOnJS,
  // @ts-expect-error - required for resolving the module
  registerWorkletStackDetails as ResolvedRegisterWorkletStackDetails,
  // @ts-expect-error - required for resolving the module
  runOnUI as ResolvedRunOnUI,
  // @ts-expect-error - required for resolving the module
  runOnJS as ResolvedRunOnJS,
  // @ts-expect-error - required for resolving the module
  runOnUIImmediately as ResolvedRunOnUIImmediately,
  // @ts-expect-error - required for resolving the module
  executeOnUIRuntimeSync as ResolvedExecuteOnUIRuntimeSync,
  // @ts-expect-error - required for resolving the module
  makeShareable as ResolvedMakeShareable,
  // @ts-expect-error - required for resolving the module
  makeShareableCloneRecursive as ResolvedMakeShareableCloneRecursive,
  // @ts-expect-error - required for resolving the module
  makeShareableCloneOnUIRecursive as ResolvedMakeShareableCloneOnUIRecursive,
  // @ts-expect-error - required for resolving the module
  shareableMappingCache as ResolvedShareableMappingCache,
  // @ts-expect-error - required for resolving the module
  callMicrotasks as ResolvedCallMicrotasks,
  // @ts-expect-error - required for resolving the module
  logger as ResolvedLogger,
  // @ts-expect-error - required for resolving the module
  updateLoggerConfig as ResolvedUpdateLoggerConfig,
  // @ts-expect-error - required for resolving the module
  LogLevel as ResolvedLogLevel,
  // @ts-expect-error - required for resolving the module
  registerLoggerConfig as ResolvedRegisterLoggerConfig,
  // @ts-expect-error - required for resolving the module
  setupCallGuard as ResolvedSetupCallGuard,
  // @ts-expect-error - required for resolving the module
  setupConsole as ResolvedSetupConsole,
} from './WorkletsResolver';

export const WorkletsModule = ResolvedWorkletsModule as IWorkletsModule;
export const isWorkletFunction =
  ResolvedIsWorkletFunction as typeof isWorkletFunctionType;
export const mockedRequestAnimationFrame =
  ResolvedMockedRequestAnimationFrame as typeof mockedRequestAnimationFrameType;
export const createCustomError =
  ResolvedCreateCustomError as typeof createCustomErrorType;
export const registerCustomError =
  ResolvedRegisterCustomError as typeof registerCustomErrorType;
export const reportFatalErrorOnJS =
  ResolvedReportFatalErrorOnJS as typeof reportFatalErrorOnJSType;
export const registerWorkletStackDetails =
  ResolvedRegisterWorkletStackDetails as typeof registerWorkletStackDetailsType;
export const runOnUI = ResolvedRunOnUI as typeof runOnUIType;
export const runOnJS = ResolvedRunOnJS as typeof runOnJSType;
export const runOnUIImmediately =
  ResolvedRunOnUIImmediately as typeof runOnUIImmediatelyType;
export const executeOnUIRuntimeSync =
  ResolvedExecuteOnUIRuntimeSync as typeof executeOnUIRuntimeSyncType;
export const makeShareable = ResolvedMakeShareable as typeof makeShareableType;
export const makeShareableCloneRecursive =
  ResolvedMakeShareableCloneRecursive as typeof makeShareableCloneRecursiveType;
export const makeShareableCloneOnUIRecursive =
  ResolvedMakeShareableCloneOnUIRecursive as typeof makeShareableCloneOnUIRecursiveType;
export const shareableMappingCache =
  ResolvedShareableMappingCache as typeof shareableMappingCacheType;
export const callMicrotasks =
  ResolvedCallMicrotasks as typeof callMicrotasksType;
export const logger = ResolvedLogger as typeof loggerType;
export const updateLoggerConfig =
  ResolvedUpdateLoggerConfig as typeof updateLoggerConfigType;
export const LogLevel = ResolvedLogLevel as typeof LogLevelType;
export const registerLoggerConfig =
  ResolvedRegisterLoggerConfig as typeof registerLoggerConfigType;
export const setupCallGuard =
  ResolvedSetupCallGuard as typeof setupCallGuardType;
export const setupConsole = ResolvedSetupConsole as typeof setupConsoleType;

export type {
  IWorkletsModule,
  WorkletsModuleProxy,
  ShareableRef,
  WorkletFunction,
  WorkletRuntime,
  WorkletStackDetails,
  WorkletFunctionDev,
  LoggerConfig,
} from '../worklets';
