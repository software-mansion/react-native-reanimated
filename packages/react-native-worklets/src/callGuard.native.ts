'use strict';

import type { RNError } from './debug/errors';

/** Used only with debug builds. */
export function callGuardDEV<Args extends unknown[], ReturnValue>(
  fn: (...args: Args) => ReturnValue,
  scheduleStack: string,
  ...args: Args
): ReturnValue | void {
  'worklet';
  try {
    return fn(...args);
  } catch (error) {
    if (globalThis.__workletsModuleProxy) {
      const { message, stack, name, jsEngine } = error as RNError;

      const label = (globalThis as unknown as Record<string, string>)._LABEL;
      const labeledWorkletFrames = (stack ?? '')
        .split('\n    at')
        .map((line) => `\n    at [${label}]:` + line)
        .join('');

      // Strip the "Error" header from the schedule stack, keeping all frames.
      const scheduleFrames = scheduleStack
        ? scheduleStack.substring(scheduleStack.indexOf('\n    at'))
        : '';

      // `message` acts as the header consumed by slice(1); worklet frames come
      // first so "Source" points to the throw, schedule frames follow.
      const combinedStack = (message + labeledWorkletFrames + scheduleFrames)
        .split('\n    at')
        .slice(1)
        .join('\n    at');

      globalThis.__workletsModuleProxy.reportFatalErrorOnJS(
        message,
        combinedStack,
        name ?? 'WorkletsError',
        jsEngine ?? 'Worklets'
      );
    } else {
      throw error;
    }
  }
}

export function setupCallGuard() {
  'worklet';
  if (!globalThis.__callGuardDEV) {
    globalThis.__callGuardDEV = callGuardDEV;
  }
}
