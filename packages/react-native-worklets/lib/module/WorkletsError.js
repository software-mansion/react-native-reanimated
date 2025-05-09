/* eslint-disable reanimated/use-worklets-error */
'use strict';

function WorkletsErrorConstructor(message) {
  'worklet';

  const prefix = '[Worklets]';
  const errorInstance = new Error(message ? `${prefix} ${message}` : prefix);
  errorInstance.name = `WorkletsError`;
  return errorInstance;
}

/**
 * Registers WorkletsError in the global scope. Register only for Worklet
 * runtimes.
 */
export function registerWorkletsError() {
  'worklet';

  if (globalThis._WORKLET) {
    globalThis.WorkletsError = WorkletsErrorConstructor;
  }
}
export const WorkletsError = WorkletsErrorConstructor;

// signed type
//# sourceMappingURL=WorkletsError.js.map