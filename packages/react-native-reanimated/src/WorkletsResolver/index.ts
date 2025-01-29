'use strict';

// react-native-reanimated isn't allowed to import anything directly
// from `worklets` directory. Everything should be acquired through
// the `WorkletsResolver` module.

import type {
  isWorkletFunction as isWorkletFunctionType,
  IWorkletsModule,
  mockedRequestAnimationFrame as mockedRequestAnimationFrameType,
} from '../worklets';

import {
  // @ts-expect-error - required for resolving the module
  WorkletsModule as ResolvedWorkletsModule,
  // @ts-expect-error - required for resolving the module
  isWorkletFunction as ResolvedIsWorkletFunction,
  // @ts-expect-error - required for resolving the module
  mockedRequestAnimationFrame as ResolvedMockedRequestAnimationFrame,
} from './WorkletsResolver';

export const WorkletsModule = ResolvedWorkletsModule as IWorkletsModule;
export const isWorkletFunction =
  ResolvedIsWorkletFunction as typeof isWorkletFunctionType;
export const mockedRequestAnimationFrame =
  ResolvedMockedRequestAnimationFrame as typeof mockedRequestAnimationFrameType;

export type {
  IWorkletsModule,
  WorkletsModuleProxy,
  ShareableRef,
  WorkletFunction,
  WorkletRuntime,
  WorkletStackDetails,
  WorkletFunctionDev,
} from '../worklets';
