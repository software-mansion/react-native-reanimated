'use strict';

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
      const { message, stack, name } = error as Error;
      globalThis.__workletsModuleProxy.reportFatalErrorOnJS(
        message,
        stack ?? '',
        name ?? 'WorkletsError'
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
