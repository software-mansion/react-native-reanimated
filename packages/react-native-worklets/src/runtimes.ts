'use strict';

import { WorkletsError } from './debug/WorkletsError';
import { RuntimeKind } from './runtimeKind';
import type {
  WorkletFunction,
  WorkletRuntime,
  WorkletRuntimeConfig,
} from './types';

export const UIRuntimeID = RuntimeKind.UI;

export function createWorkletRuntime(
  config?: WorkletRuntimeConfig
): WorkletRuntime;

export function createWorkletRuntime(
  name?: string,
  initializer?: () => void
): WorkletRuntime;

export function createWorkletRuntime(): never {
  throw new WorkletsError('`createWorkletRuntime` is not supported on web.');
}

export function runOnRuntime<Args extends unknown[], ReturnValue>(
  workletRuntime: WorkletRuntime,
  worklet: (...args: Args) => ReturnValue
): WorkletFunction<Args, ReturnValue>;

export function runOnRuntime(): never {
  throw new WorkletsError('`runOnRuntime` is not supported on web.');
}

export function scheduleOnRuntime<Args extends unknown[], ReturnValue>(
  workletRuntime: WorkletRuntime,
  worklet: (...args: Args) => ReturnValue,
  ...args: Args
): void;

export function scheduleOnRuntime(): never {
  throw new WorkletsError('`scheduleOnRuntime` is not supported on web.');
}

export function scheduleOnRuntimeWithId<Args extends unknown[], ReturnValue>(
  runtimeId: number,
  worklet: (...args: Args) => ReturnValue,
  ...args: Args
): void;

export function scheduleOnRuntimeWithId(): never {
  throw new WorkletsError('`scheduleOnRuntimeWithId` is not supported on web.');
}

export function runOnRuntimeSync<Args extends unknown[], ReturnValue>(
  workletRuntime: WorkletRuntime,
  worklet: (...args: Args) => ReturnValue,
  ...args: Args
): ReturnValue;

export function runOnRuntimeSync(): never {
  throw new WorkletsError('`runOnRuntimeSync` is not supported on web.');
}

export function runOnRuntimeSyncWithId<Args extends unknown[], ReturnValue>(
  runtimeId: number,
  worklet: (...args: Args) => ReturnValue,
  ...args: Args
): ReturnValue;

export function runOnRuntimeSyncWithId(): never {
  throw new WorkletsError('`runOnRuntimeSyncWithId` is not supported on web.');
}

export function runOnRuntimeAsync<Args extends unknown[], ReturnValue>(
  workletRuntime: WorkletRuntime,
  worklet: (...args: Args) => ReturnValue,
  ...args: Args
): Promise<ReturnValue>;

export function runOnRuntimeAsync(): never {
  throw new WorkletsError('`runOnRuntimeAsync` is not supported on web.');
}

export function getUIRuntimeHolder(): object {
  throw new WorkletsError('`getUIRuntimeHolder` is not supported on web.');
}

export function getUISchedulerHolder(): object {
  throw new WorkletsError('`getUISchedulerHolder` is not supported on web.');
}
