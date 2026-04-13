'use strict';

import { RuntimeKind } from './runtimeKind';
import type {
  WorkletFunction,
  WorkletRuntime,
  WorkletRuntimeConfig,
} from './types';

export const UIRuntimeId = RuntimeKind.UI;

export function createWorkletRuntime(
  config?: WorkletRuntimeConfig
): WorkletRuntime;

export function createWorkletRuntime(
  name?: string,
  initializer?: () => void
): WorkletRuntime;

export function createWorkletRuntime(): never {
  throw new Error('[Worklets] `createWorkletRuntime` is not supported on web.');
}

export function runOnRuntime<Args extends unknown[], ReturnValue>(
  workletRuntime: WorkletRuntime,
  worklet: (...args: Args) => ReturnValue
): WorkletFunction<Args, ReturnValue>;

export function runOnRuntime(): never {
  throw new Error('[Worklets] `runOnRuntime` is not supported on web.');
}

export function scheduleOnRuntime<Args extends unknown[], ReturnValue>(
  workletRuntime: WorkletRuntime,
  worklet: (...args: Args) => ReturnValue,
  ...args: Args
): void;

export function scheduleOnRuntime(): never {
  throw new Error('[Worklets] `scheduleOnRuntime` is not supported on web.');
}

export function scheduleOnRuntimeWithId<Args extends unknown[], ReturnValue>(
  runtimeId: number,
  worklet: (...args: Args) => ReturnValue,
  ...args: Args
): void;

export function scheduleOnRuntimeWithId(): never {
  throw new Error(
    '[Worklets] `scheduleOnRuntimeWithId` is not supported on web.'
  );
}

export function runOnRuntimeSync<Args extends unknown[], ReturnValue>(
  workletRuntime: WorkletRuntime,
  worklet: (...args: Args) => ReturnValue,
  ...args: Args
): ReturnValue;

export function runOnRuntimeSync(): never {
  throw new Error('[Worklets] `runOnRuntimeSync` is not supported on web.');
}

export function runOnRuntimeSyncWithId<Args extends unknown[], ReturnValue>(
  runtimeId: number,
  worklet: (...args: Args) => ReturnValue,
  ...args: Args
): ReturnValue;

export function runOnRuntimeSyncWithId(): never {
  throw new Error(
    '[Worklets] `runOnRuntimeSyncWithId` is not supported on web.'
  );
}

export function runOnRuntimeAsync<Args extends unknown[], ReturnValue>(
  workletRuntime: WorkletRuntime,
  worklet: (...args: Args) => ReturnValue,
  ...args: Args
): Promise<ReturnValue>;

export function runOnRuntimeAsync(): never {
  throw new Error('[Worklets] `runOnRuntimeAsync` is not supported on web.');
}

export function getUIRuntimeHolder(): object {
  throw new Error('[Worklets] `getUIRuntimeHolder` is not supported on web.');
}

export function getUISchedulerHolder(): object {
  throw new Error('[Worklets] `getUISchedulerHolder` is not supported on web.');
}
