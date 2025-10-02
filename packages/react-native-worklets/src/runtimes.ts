'use strict';

export function createWorkletRuntime(): never {
  throw new WorkletsError('`createWorkletRuntime` is not supported on web.');
}

export function runOnRuntime(): never {
  throw new WorkletsError('`runOnRuntime` is not supported on web.');
}

export function scheduleOnRuntime(): never {
  throw new WorkletsError('`scheduleOnRuntime` is not supported on web.');
}
