'use strict';

/** Used only with debug builds. */
export function callGuardDEV<Args extends unknown[], ReturnValue>(
  fn: (...args: Args) => ReturnValue,
  ...args: Args
): ReturnValue | void {
  'worklet';
  try {
    return fn(...args);
  } catch (e) {
    if (globalThis.__ErrorUtils) {
      globalThis.__ErrorUtils.reportFatalError(e as Error);
    } else {
      throw e;
    }
  }
}

export function setupCallGuard() {
  'worklet';
  if (!globalThis.__callGuardDEV) {
    globalThis.__callGuardDEV = callGuardDEV;
  }
}
