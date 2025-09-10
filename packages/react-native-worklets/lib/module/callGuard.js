'use strict';

/** Used only with debug builds. */
export function callGuardDEV(fn, ...args) {
  'worklet';

  try {
    return fn(...args);
  } catch (error) {
    if (globalThis.__workletsModuleProxy) {
      const {
        message,
        stack,
        name,
        jsEngine
      } = error;
      globalThis.__workletsModuleProxy.reportFatalErrorOnJS(message, stack ?? '', name ?? 'WorkletsError', jsEngine ?? 'Worklets');
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
//# sourceMappingURL=callGuard.js.map