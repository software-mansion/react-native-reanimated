'use strict';

import { RuntimeKind } from "./runtimeKind.js";
function WorkletsErrorConstructor(message) {
  'worklet';

  const prefix = '[Worklets]';

  // eslint-disable-next-line reanimated/use-worklets-error
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

  if (globalThis.__RUNTIME_KIND !== RuntimeKind.ReactNative) {
    globalThis.WorkletsError = WorkletsErrorConstructor;
  }
}
export const WorkletsError = WorkletsErrorConstructor;

// signed type
//# sourceMappingURL=WorkletsError.js.map