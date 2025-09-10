'use strict';

import { pushMicrotask } from "./taskQueue.js";
export function setupQueueMicrotask() {
  'worklet';

  globalThis.queueMicrotask = function (callback, ...args) {
    pushMicrotask(() => callback(...args));
  };
}
//# sourceMappingURL=queueMicrotask.js.map