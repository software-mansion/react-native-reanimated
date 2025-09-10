/* eslint-disable reanimated/use-reanimated-error */
'use strict';

import { RuntimeKind } from 'react-native-worklets';
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

  if (globalThis.__RUNTIME_KIND !== RuntimeKind.ReactNative) {
    globalThis.ReanimatedError = ReanimatedErrorConstructor;
  }
}
export const ReanimatedError = ReanimatedErrorConstructor;

// signed type
//# sourceMappingURL=errors.js.map