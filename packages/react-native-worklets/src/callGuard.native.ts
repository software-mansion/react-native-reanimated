'use strict';

/** Used only with debug builds. */
export function callGuardDEV<Args extends unknown[], ReturnValue>(
  fn: (...args: Args) => ReturnValue,
  scheduleStack: string | undefined,
  ...args: Args
): ReturnValue | void {
  'worklet';
  try {
    return fn(...args);
  } catch (error) {
    if (globalThis.__workletsModuleProxy) {
      const { message, stack, name } = error as Error;

      const label = (globalThis as unknown as Record<string, string>)._LABEL;
      const labeledWorkletFrames = (stack ?? '')
        .split('\n    at')
        .map((line) => `\n    at [${label}]:` + line)
        .slice(1) // remove error message
        .join('');

      const scheduleFrames = scheduleStack
        ? scheduleStack.substring(scheduleStack.indexOf('\n    at'))
        : '';

      const combinedStack = message + labeledWorkletFrames + scheduleFrames;

      globalThis.__workletsModuleProxy.reportFatalErrorOnJS(
        message,
        combinedStack,
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
