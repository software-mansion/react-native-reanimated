'use strict';

// react-native-reanimated isn't allowed to import anything directly
// from `worklets` directory. Everything should be acquired through
// the `WorkletsResolver` module.

import type {
  callMicrotasks as callMicrotasksType,
  createCustomError as createCustomErrorType,
  createWorkletRuntime as createWorkletRuntimeType,
  executeOnUIRuntimeSync as executeOnUIRuntimeSyncType,
  isWorkletFunction as isWorkletFunctionType,
  IWorkletsModule,
  logger as loggerType,
  LogLevel as LogLevelType,
  makeShareable as makeShareableType,
  makeShareableCloneOnUIRecursive as makeShareableCloneOnUIRecursiveType,
  makeShareableCloneRecursive as makeShareableCloneRecursiveType,
  mockedRequestAnimationFrame as mockedRequestAnimationFrameType,
  registerCustomError as registerCustomErrorType,
  registerLoggerConfig as registerLoggerConfigType,
  registerWorkletStackDetails as registerWorkletStackDetailsType,
  reportFatalErrorOnJS as reportFatalErrorOnJSType,
  runOnJS as runOnJSType,
  runOnRuntime as runOnRuntimeType,
  runOnUI as runOnUIType,
  runOnUIImmediately as runOnUIImmediatelyType,
  setupCallGuard as setupCallGuardType,
  setupConsole as setupConsoleType,
  shareableMappingCache as shareableMappingCacheType,
  updateLoggerConfig as updateLoggerConfigType,
} from '../worklets';
import {
  // @ts-expect-error - required for resolving the module
  callMicrotasks as ResolvedCallMicrotasks,
  // @ts-expect-error - required for resolving the module
  createCustomError as ResolvedCreateCustomError,
  // @ts-expect-error - required for resolving the module
  createWorkletRuntime as ResolvedCreateWorkletRuntime,
  // @ts-expect-error - required for resolving the module
  executeOnUIRuntimeSync as ResolvedExecuteOnUIRuntimeSync,
  // @ts-expect-error - required for resolving the module
  isWorkletFunction as ResolvedIsWorkletFunction,
  // @ts-expect-error - required for resolving the module
  logger as ResolvedLogger,
  // @ts-expect-error - required for resolving the module
  LogLevel as ResolvedLogLevel,
  // @ts-expect-error - required for resolving the module
  makeShareable as ResolvedMakeShareable,
  // @ts-expect-error - required for resolving the module
  makeShareableCloneOnUIRecursive as ResolvedMakeShareableCloneOnUIRecursive,
  // @ts-expect-error - required for resolving the module
  makeShareableCloneRecursive as ResolvedMakeShareableCloneRecursive,
  // @ts-expect-error - required for resolving the module
  mockedRequestAnimationFrame as ResolvedMockedRequestAnimationFrame,
  // @ts-expect-error - required for resolving the module
  registerCustomError as ResolvedRegisterCustomError,
  // @ts-expect-error - required for resolving the module
  registerLoggerConfig as ResolvedRegisterLoggerConfig,
  // @ts-expect-error - required for resolving the module
  registerWorkletStackDetails as ResolvedRegisterWorkletStackDetails,
  // @ts-expect-error - required for resolving the module
  reportFatalErrorOnJs as ResolvedReportFatalErrorOnJS,
  // @ts-expect-error - required for resolving the module
  runOnJS as ResolvedRunOnJS,
  // @ts-expect-error - required for resolving the module
  runOnRuntime as ResolvedRunOnRuntime,
  // @ts-expect-error - required for resolving the module
  runOnUI as ResolvedRunOnUI,
  // @ts-expect-error - required for resolving the module
  runOnUIImmediately as ResolvedRunOnUIImmediately,
  // @ts-expect-error - required for resolving the module
  setupCallGuard as ResolvedSetupCallGuard,
  // @ts-expect-error - required for resolving the module
  setupConsole as ResolvedSetupConsole,
  // @ts-expect-error - required for resolving the module
  shareableMappingCache as ResolvedShareableMappingCache,
  // @ts-expect-error - required for resolving the module
  updateLoggerConfig as ResolvedUpdateLoggerConfig,
  // @ts-expect-error - required for resolving the module
  WorkletsModule as ResolvedWorkletsModule,
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
export const createWorkletRuntime =
  ResolvedCreateWorkletRuntime as typeof createWorkletRuntimeType;
export const runOnRuntime = ResolvedRunOnRuntime as typeof runOnRuntimeType;

export type {
  IWorkletsModule,
  LoggerConfig,
  ShareableRef,
  WorkletFunction,
  WorkletFunctionDev,
  WorkletRuntime,
  WorkletsModuleProxy,
  WorkletStackDetails,
} from '../worklets';
