'use strict';

import { pushTask } from "./taskQueue.js";
export function setupSetTimeout() {
  'worklet';

  const pendingHandlers = new Set();
  let ID = 0;
  const setTimeoutPolyfill = (callback, delay = 0, ...args) => {
    const handlerId = ID++;
    const timeoutCallback = () => {
      if (!pendingHandlers.has(handlerId)) {
        return;
      }
      callback(...args);
      pendingHandlers.delete(handlerId);
    };
    pendingHandlers.add(handlerId);
    pushTask(timeoutCallback, handlerId, delay);
    return handlerId;
  };
  const clearTimeoutPolyfill = timeoutHandle => {
    pendingHandlers.delete(timeoutHandle);
  };
  globalThis.setTimeout = setTimeoutPolyfill;
  globalThis.clearTimeout = clearTimeoutPolyfill;
}
//# sourceMappingURL=setTimeout.js.map