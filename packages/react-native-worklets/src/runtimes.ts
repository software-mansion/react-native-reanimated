'use strict';

import { WorkletsError } from './debug/WorkletsError';
import type {
  WorkletFunction,
  WorkletRuntime,
  WorkletRuntimeConfig,
} from './types';

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
