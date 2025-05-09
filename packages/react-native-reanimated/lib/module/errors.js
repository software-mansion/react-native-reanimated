/* eslint-disable reanimated/use-reanimated-error */
'use strict';

function ReanimatedErrorConstructor(message) {
  'worklet';

  const prefix = '[Reanimated]';
  const errorInstance = new Error(message ? `${prefix} ${message}` : prefix);
  errorInstance.name = 'ReanimatedError';
  return errorInstance;
}

/**
 * Registers ReanimatedError in the global scope. Register only for Worklet
 * runtimes.
 */
export function registerReanimatedError() {
  'worklet';

  if (globalThis._WORKLET) {
    globalThis.ReanimatedError = ReanimatedErrorConstructor;
  }
}
export const ReanimatedError = ReanimatedErrorConstructor;

// signed type
//# sourceMappingURL=errors.js.map