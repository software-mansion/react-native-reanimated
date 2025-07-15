'use strict';

import type { RNError } from './errors';

/** Used only with debug builds. */
export function callGuardDEV<Args extends unknown[], ReturnValue>(
  fn: (...args: Args) => ReturnValue,
  ...args: Args
): ReturnValue | void {
  'worklet';
  try {
    return fn(...args);
  } catch (error) {
    if (globalThis.__workletsModuleProxy) {
      const { message, stack, name, jsEngine } = error as RNError;
      globalThis.__workletsModuleProxy.reportFatalErrorOnJS(
        message,
        stack ?? '',
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
